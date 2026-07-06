import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Notification } from '@midnite/shared';

// next/navigation's useRouter throws outside the App Router runtime, so stub it.
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

// Drive the component off a controllable provider mock rather than a live socket.
const markRead = vi.fn();
const markAllRead = vi.fn();
const dismiss = vi.fn();
const clear = vi.fn();
let notificationsState: {
  feed: Notification[];
  unread: number;
  loading: boolean;
};
vi.mock('@/components/notifications-provider', () => ({
  useNotifications: () => ({ ...notificationsState, markRead, markAllRead, dismiss, clear }),
}));

import { NotificationCenter } from './notification-center';

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

describe('NotificationCenter', () => {
  beforeEach(() => {
    notificationsState = {
      feed: [
        notification({ id: 'a', title: 'Agent needs your input', route: '/tasks?task=a' }),
        notification({
          id: 'b',
          title: 'Task finished',
          severity: 'info',
          kind: 'task.done',
          readAt: '2026-01-01T00:00:00Z',
          route: '/tasks?task=b',
        }),
      ],
      unread: 1,
      loading: false,
    };
  });

  afterEach(() => {
    push.mockReset();
    markRead.mockReset();
    markAllRead.mockReset();
    dismiss.mockReset();
    clear.mockReset();
  });

  it('shows the unread count badge and announces it on the bell', () => {
    render(<NotificationCenter />);
    const bell = screen.getByRole('button', { name: 'Notifications, 1 unread' });
    expect(bell).toBeInTheDocument();
    expect(bell).toHaveTextContent('1');
  });

  it('hides the badge when there are no unread notifications', () => {
    notificationsState.unread = 0;
    render(<NotificationCenter />);
    const bell = screen.getByRole('button', { name: 'Notifications' });
    expect(bell).not.toHaveTextContent('1');
  });

  it('shows the "Notifications" label and unread count inside the button when expanded', () => {
    render(<NotificationCenter expanded />);
    const bell = screen.getByRole('button', { name: 'Notifications, 1 unread' });
    expect(bell).toHaveTextContent('Notifications');
    expect(bell).toHaveTextContent('1');
  });

  it('is an icon-only button (no inline label) when collapsed', () => {
    render(<NotificationCenter />);
    const bell = screen.getByRole('button', { name: 'Notifications, 1 unread' });
    // Collapsed shows the icon + a separate hover tooltip — the label is never
    // inline in the button itself, only the corner unread badge.
    expect(bell).not.toHaveTextContent('Notifications');
    expect(bell).toHaveTextContent('1');
  });

  it('opens the dropdown and lists the feed newest-first', () => {
    render(<NotificationCenter />);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('menu', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Agent needs your input')).toBeInTheDocument();
    expect(screen.getByText('Task finished')).toBeInTheDocument();
  });

  it('marks all read via the header action', () => {
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    expect(markAllRead).toHaveBeenCalledOnce();
  });

  it('disables Mark all read when nothing is unread', () => {
    notificationsState.unread = 0;
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
  });

  it('clears the feed via the header action', () => {
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear notifications' }));
    expect(clear).toHaveBeenCalledOnce();
  });

  it('dismisses a single notification via its per-row button', () => {
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification: Agent needs your input' }));
    expect(dismiss).toHaveBeenCalledWith('a');
    // Dismiss is independent of opening/marking-read the entry.
    expect(push).not.toHaveBeenCalled();
    expect(markRead).not.toHaveBeenCalled();
  });

  it('routes to a notification and marks it read on click', () => {
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    fireEvent.click(screen.getByText('Agent needs your input'));
    expect(markRead).toHaveBeenCalledWith(['a']);
    expect(push).toHaveBeenCalledWith('/tasks?task=a');
    // The dropdown closes after navigating.
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows the empty state when the feed is empty', () => {
    notificationsState = { feed: [], unread: 0, loading: false };
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear notifications' })).toBeDisabled();
  });

  it('shows a loading state while the feed is fetching', () => {
    notificationsState = { feed: [], unread: 0, loading: true };
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
