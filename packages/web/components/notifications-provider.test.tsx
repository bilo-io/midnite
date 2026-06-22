import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '@midnite/shared';
import {
  URGENT_TOAST_MS,
  initialNotificationsState,
  notificationsReducer,
  toastForSeverity,
} from './notifications-provider';

const notification = (over: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  kind: 'task.waiting',
  severity: 'warn',
  title: 'Agent needs your input',
  body: 'Fix the login bug',
  entity: { type: 'task', id: 't1' },
  route: '/tasks?task=t1',
  readAt: null,
  createdAt: new Date().toISOString(),
  ...over,
});

describe('notificationsReducer', () => {
  it('loads a feed + unread count', () => {
    const feed = [
      notification({ id: 'a' }),
      notification({ id: 'b', readAt: '2026-01-01T00:00:00Z' }),
    ];
    const next = notificationsReducer(initialNotificationsState, { type: 'load', feed, unread: 1 });
    expect(next.feed).toHaveLength(2);
    expect(next.unread).toBe(1);
  });

  it('prepends a created notification and bumps unread', () => {
    const state = notificationsReducer(initialNotificationsState, {
      type: 'load',
      feed: [notification({ id: 'old' })],
      unread: 1,
    });
    const next = notificationsReducer(state, {
      type: 'created',
      notification: notification({ id: 'new', title: 'Fresh' }),
    });
    expect(next.feed[0]?.id).toBe('new'); // newest first
    expect(next.feed.map((n) => n.id)).toEqual(['new', 'old']);
    expect(next.unread).toBe(2);
  });

  it('de-dupes a created notification that races the initial fetch', () => {
    const state = notificationsReducer(initialNotificationsState, {
      type: 'load',
      feed: [notification({ id: 'dup' })],
      unread: 1,
    });
    const next = notificationsReducer(state, {
      type: 'created',
      notification: notification({ id: 'dup' }),
    });
    expect(next.feed).toHaveLength(1);
    expect(next.unread).toBe(1);
  });

  it('marks specific ids read and recomputes unread', () => {
    const state = notificationsReducer(initialNotificationsState, {
      type: 'load',
      feed: [notification({ id: 'a' }), notification({ id: 'b' })],
      unread: 2,
    });
    const next = notificationsReducer(state, { type: 'markRead', ids: ['a'] });
    expect(next.feed.find((n) => n.id === 'a')?.readAt).not.toBeNull();
    expect(next.unread).toBe(1);
  });

  it('marks all read', () => {
    const state = notificationsReducer(initialNotificationsState, {
      type: 'load',
      feed: [notification({ id: 'a' }), notification({ id: 'b' })],
      unread: 2,
    });
    const next = notificationsReducer(state, { type: 'markAllRead' });
    expect(next.unread).toBe(0);
    expect(next.feed.every((n) => n.readAt !== null)).toBe(true);
  });

  it('clears the feed', () => {
    const state = notificationsReducer(initialNotificationsState, {
      type: 'load',
      feed: [notification()],
      unread: 1,
    });
    const next = notificationsReducer(state, { type: 'clear' });
    expect(next.feed).toHaveLength(0);
    expect(next.unread).toBe(0);
  });
});

describe('toastForSeverity', () => {
  const makeToast = () => ({ success: vi.fn(), error: vi.fn() });

  it('fires an affirmative toast for info', () => {
    const toast = makeToast();
    toastForSeverity(toast, 'info', 'Task finished');
    expect(toast.success).toHaveBeenCalledWith('Task finished');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('fires a destructive toast for warn', () => {
    const toast = makeToast();
    toastForSeverity(toast, 'warn', 'Needs input');
    expect(toast.error).toHaveBeenCalledWith('Needs input');
  });

  it('fires a long-lived (sticky-approximating) destructive toast for urgent', () => {
    const toast = makeToast();
    toastForSeverity(toast, 'urgent', 'Task abandoned');
    expect(toast.error).toHaveBeenCalledWith('Task abandoned', { duration: URGENT_TOAST_MS });
  });
});
