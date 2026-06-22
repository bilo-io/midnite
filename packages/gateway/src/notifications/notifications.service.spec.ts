import type { MidniteConfig, NotificationEvent, Task } from '@midnite/shared';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidniteDb } from '../db/db.module';
import * as schema from '../db/schema';
import { TaskEventBus } from '../tasks/task-event-bus';
import { NotificationEventBus } from './notification-event-bus';
import { NotificationsRepository } from './notifications.repository';
import { NOTIFICATION_COALESCE_MS, NotificationsService } from './notifications.service';

type Events = { taskWaiting: boolean; taskDone: boolean; taskAbandoned: boolean };

function makeHarness(opts: { enabled?: boolean; events?: Partial<Events> } = {}) {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema }) as unknown as MidniteDb;
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });

  const config = {
    notifications: {
      enabled: opts.enabled ?? true,
      events: { taskWaiting: true, taskDone: true, taskAbandoned: true, ...opts.events },
      channels: { web: true, browser: false },
    },
  } as unknown as MidniteConfig;

  const repo = new NotificationsRepository(db);
  const bus = new NotificationEventBus();
  const events: NotificationEvent[] = [];
  bus.subscribe((e) => events.push(e));
  const taskBus = new TaskEventBus();
  const svc = new NotificationsService(config, repo, bus, taskBus);
  svc.onModuleInit();
  return { svc, repo, bus, taskBus, events };
}

const task = (id: string, status: Task['status'], title = 'Fix login'): Task =>
  ({ id, title, status }) as Task;

const updated = (t: Task) => ({ type: 'task.updated' as const, at: 'now', task: t });

describe('NotificationsService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('persists + emits one notification when a task enters done', () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('t1', 'done')));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);

    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toMatchObject({
      type: 'notification.created',
      notification: { kind: 'task.done', severity: 'info', entity: { type: 'task', id: 't1' }, route: '/tasks' },
    });
    const { notifications, unread } = h.svc.list({});
    expect(notifications).toHaveLength(1);
    expect(unread).toBe(1);
  });

  it('maps waiting → warn and abandoned → urgent', () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('w', 'waiting')));
    h.taskBus.emit(updated(task('a', 'abandoned')));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);
    const kinds = h.events.map((e) => e.notification.severity).sort();
    expect(kinds).toEqual(['urgent', 'warn']);
  });

  it('ignores non-terminal statuses', () => {
    const h = makeHarness();
    for (const s of ['backlog', 'todo', 'wip'] as const) h.taskBus.emit(updated(task('x', s)));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);
    expect(h.events).toHaveLength(0);
  });

  it('honours a disabled event toggle', () => {
    const h = makeHarness({ events: { taskDone: false } });
    h.taskBus.emit(updated(task('t1', 'done')));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);
    expect(h.events).toHaveLength(0);
  });

  it('coalesces a same-kind burst into one counted notification', () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('t1', 'done')));
    h.taskBus.emit(updated(task('t2', 'done')));
    h.taskBus.emit(updated(task('t3', 'done', 'Last one')));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);

    expect(h.events).toHaveLength(1);
    expect(h.events[0]!.notification.title).toBe('3 tasks finished');
    expect(h.events[0]!.notification.body).toContain('Last one');
    expect(h.svc.list({}).unread).toBe(1);
  });

  it('does not subscribe when notifications are disabled', () => {
    const h = makeHarness({ enabled: false });
    h.taskBus.emit(updated(task('t1', 'done')));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);
    expect(h.events).toHaveLength(0);
  });

  it('marks ids / all read and clears', () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('t1', 'done')));
    h.taskBus.emit(updated(task('w', 'waiting')));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);
    expect(h.svc.list({}).unread).toBe(2);

    const firstId = h.svc.list({}).notifications[0]!.id;
    expect(h.svc.markRead({ ids: [firstId] }).unread).toBe(1);
    expect(h.svc.markRead({ all: true }).unread).toBe(0);

    h.svc.clear();
    expect(h.svc.list({}).notifications).toHaveLength(0);
  });

  it('stops ingesting after destroy', () => {
    const h = makeHarness();
    h.svc.onModuleDestroy();
    h.taskBus.emit(updated(task('t1', 'done')));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);
    expect(h.events).toHaveLength(0);
  });

  it('orders the feed unread-first', () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('t1', 'done')));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);
    const firstId = h.svc.list({}).notifications[0]!.id;
    h.svc.markRead({ ids: [firstId] });
    h.taskBus.emit(updated(task('w', 'waiting')));
    vi.advanceTimersByTime(NOTIFICATION_COALESCE_MS);

    // The still-unread one sorts ahead of the read one.
    const feed = h.svc.list({}).notifications;
    expect(feed[0]!.readAt).toBeNull();
    expect(feed[1]!.readAt).not.toBeNull();
  });
});
