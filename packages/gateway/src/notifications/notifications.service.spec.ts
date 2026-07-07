import type { MidniteConfig, NotificationEvent, Task } from '@midnite/shared';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidniteDb } from '../db/db.module';
import * as schema from '../db/schema';
import { TaskEventBus } from '../tasks/task-event-bus';
import { WebChannel } from './channels/web.channel';
import { NotificationDispatcher } from './notification-dispatcher.service';
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
  // Real dispatcher + WebChannel so the WS emit still flows (Theme B wiring).
  const dispatcher = new NotificationDispatcher(config, [new WebChannel(bus)]);
  const taskBus = new TaskEventBus();
  const svc = new NotificationsService(config, repo, dispatcher, taskBus);
  svc.onModuleInit();
  return { svc, repo, bus, taskBus, events };
}

const task = (id: string, status: Task['status'], title = 'Fix login'): Task =>
  ({ id, title, status }) as Task;

const updated = (t: Task) => ({ type: 'task.updated' as const, at: 'now', task: t });

/** Flush the coalesce timer + the async dispatch microtasks. */
const settle = () => vi.advanceTimersByTimeAsync(NOTIFICATION_COALESCE_MS);

describe('NotificationsService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('persists + emits one notification when a task enters done', async () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('t1', 'done')));
    await settle();

    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toMatchObject({
      type: 'notification.created',
      notification: { kind: 'task.done', severity: 'info', entity: { type: 'task', id: 't1' }, route: '/tasks' },
    });
    const { notifications, unread } = h.svc.list({});
    expect(notifications).toHaveLength(1);
    expect(unread).toBe(1);
  });

  it('maps waiting → warn and abandoned → urgent', async () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('w', 'waiting')));
    h.taskBus.emit(updated(task('a', 'abandoned')));
    await settle();
    const kinds = h.events.map((e) => e.notification.severity).sort();
    expect(kinds).toEqual(['urgent', 'warn']);
  });

  it('ignores non-terminal statuses', async () => {
    const h = makeHarness();
    for (const s of ['backlog', 'todo', 'wip'] as const) h.taskBus.emit(updated(task('x', s)));
    await settle();
    expect(h.events).toHaveLength(0);
  });

  it('honours a disabled event toggle', async () => {
    const h = makeHarness({ events: { taskDone: false } });
    h.taskBus.emit(updated(task('t1', 'done')));
    await settle();
    expect(h.events).toHaveLength(0);
  });

  it('coalesces a same-kind burst into one counted notification', async () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('t1', 'done')));
    h.taskBus.emit(updated(task('t2', 'done')));
    h.taskBus.emit(updated(task('t3', 'done', 'Last one')));
    await settle();

    expect(h.events).toHaveLength(1);
    expect(h.events[0]!.notification.title).toBe('3 tasks finished');
    expect(h.events[0]!.notification.body).toContain('Last one');
    expect(h.svc.list({}).unread).toBe(1);
  });

  it('does not subscribe when notifications are disabled', async () => {
    const h = makeHarness({ enabled: false });
    h.taskBus.emit(updated(task('t1', 'done')));
    await settle();
    expect(h.events).toHaveLength(0);
  });

  it('marks ids / all read and clears', async () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('t1', 'done')));
    h.taskBus.emit(updated(task('w', 'waiting')));
    await settle();
    expect(h.svc.list({}).unread).toBe(2);

    const firstId = h.svc.list({}).notifications[0]!.id;
    expect(h.svc.markRead({ ids: [firstId] }).unread).toBe(1);
    expect(h.svc.markRead({ all: true }).unread).toBe(0);

    h.svc.clear();
    expect(h.svc.list({}).notifications).toHaveLength(0);
  });

  it('removes a single notification by id (and is idempotent)', async () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('t1', 'done')));
    h.taskBus.emit(updated(task('w', 'waiting')));
    await settle();
    const [first, second] = h.svc.list({}).notifications;
    expect(h.svc.list({}).notifications).toHaveLength(2);

    h.svc.remove(first!.id);
    const remaining = h.svc.list({}).notifications;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(second!.id);

    // A repeat delete of the same id is a harmless no-op.
    h.svc.remove(first!.id);
    expect(h.svc.list({}).notifications).toHaveLength(1);
  });

  it('notifyGuardrailHeld persists + emits a warn "agent.held" alert (Phase 50 B)', async () => {
    const h = makeHarness();
    await h.svc.notifyGuardrailHeld('over-budget', 3);

    expect(h.events).toHaveLength(1);
    expect(h.events[0]).toMatchObject({
      type: 'notification.created',
      notification: { kind: 'agent.held', severity: 'warn', entity: { type: 'guardrail', id: 'over-budget' }, route: '/tasks' },
    });
    expect(h.events[0]!.notification.body).toContain('3 tasks held: over budget');
    expect(h.svc.list({}).unread).toBe(1);
  });

  it('notifyGuardrailHeld is a no-op when notifications are disabled', async () => {
    const h = makeHarness({ enabled: false });
    await h.svc.notifyGuardrailHeld('rate-limited', 1);
    expect(h.events).toHaveLength(0);
  });

  it('stops ingesting after destroy', async () => {
    const h = makeHarness();
    h.svc.onModuleDestroy();
    h.taskBus.emit(updated(task('t1', 'done')));
    await settle();
    expect(h.events).toHaveLength(0);
  });

  it('orders the feed unread-first', async () => {
    const h = makeHarness();
    h.taskBus.emit(updated(task('t1', 'done')));
    await settle();
    const firstId = h.svc.list({}).notifications[0]!.id;
    h.svc.markRead({ ids: [firstId] });
    h.taskBus.emit(updated(task('w', 'waiting')));
    await settle();

    // The still-unread one sorts ahead of the read one.
    const feed = h.svc.list({}).notifications;
    expect(feed[0]!.readAt).toBeNull();
    expect(feed[1]!.readAt).not.toBeNull();
  });
});
