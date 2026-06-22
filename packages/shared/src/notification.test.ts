import { describe, expect, it } from 'vitest';
import { parseConfig } from './config.js';
import {
  MarkReadRequestSchema,
  NOTIFICATION_KINDS,
  NotificationListQuerySchema,
  NotificationSchema,
  notifyForTask,
} from './notification.js';
import type { Task } from './task.js';

const allEvents = { taskWaiting: true, taskDone: true, taskAbandoned: true };
const task = (status: Task['status'], title = 'Fix login'): Task =>
  ({ id: 't1', title, status }) as Task;

describe('NotificationSchema', () => {
  it('accepts a well-formed notification', () => {
    const n = {
      id: 'n1',
      kind: 'task.done' as const,
      severity: 'info' as const,
      title: 'Task finished',
      body: 'Fix login',
      entity: { type: 'task', id: 't1' },
      route: '/tasks',
      readAt: null,
      createdAt: '2026-06-22T00:00:00.000Z',
    };
    expect(NotificationSchema.parse(n)).toEqual(n);
  });

  it('rejects an unknown kind', () => {
    expect(NOTIFICATION_KINDS).toContain('task.waiting');
    expect(NotificationSchema.safeParse({ kind: 'nope' }).success).toBe(false);
  });
});

describe('notifyForTask policy', () => {
  it('notifies on waiting / done / abandoned with the right severity', () => {
    expect(notifyForTask(task('waiting'), allEvents)).toMatchObject({ kind: 'task.waiting', severity: 'warn' });
    expect(notifyForTask(task('done'), allEvents)).toMatchObject({ kind: 'task.done', severity: 'info' });
    expect(notifyForTask(task('abandoned'), allEvents)).toMatchObject({ kind: 'task.abandoned', severity: 'urgent' });
  });

  it('carries the task title as the body', () => {
    expect(notifyForTask(task('done', 'Ship it'), allEvents)?.body).toBe('Ship it');
  });

  it('does not notify for non-terminal statuses', () => {
    for (const s of ['backlog', 'todo', 'wip'] as const) {
      expect(notifyForTask(task(s), allEvents)).toBeNull();
    }
  });

  it('respects the per-event toggles', () => {
    expect(notifyForTask(task('done'), { ...allEvents, taskDone: false })).toBeNull();
    expect(notifyForTask(task('waiting'), { ...allEvents, taskWaiting: false })).toBeNull();
  });
});

describe('request schemas', () => {
  it('coerces list paging params', () => {
    expect(NotificationListQuerySchema.parse({ limit: '10', offset: '5' })).toEqual({ limit: 10, offset: 5 });
  });

  it('requires ids[] or all on mark-read', () => {
    expect(MarkReadRequestSchema.safeParse({}).success).toBe(false);
    expect(MarkReadRequestSchema.safeParse({ all: true }).success).toBe(true);
    expect(MarkReadRequestSchema.safeParse({ ids: ['a'] }).success).toBe(true);
  });
});

describe('config.notifications defaults', () => {
  it('defaults enabled with the three events on and only the web channel', () => {
    const config = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    expect(config.notifications.enabled).toBe(true);
    expect(config.notifications.events).toEqual({ taskWaiting: true, taskDone: true, taskAbandoned: true });
    expect(config.notifications.channels.web).toBe(true);
    expect(config.notifications.channels.browser).toBe(false);
    expect(config.notifications.channels.webhook).toBeUndefined();
  });
});
