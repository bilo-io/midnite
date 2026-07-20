import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PendingApproval } from '@midnite/shared';

// NotificationFeedList routes via next/navigation's useRouter — stub it.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Drive the feed off a controllable provider mock.
const markAllRead = vi.fn();
const clear = vi.fn();
vi.mock('@/components/notifications-provider', () => ({
  useNotifications: () => ({
    feed: [],
    unread: 3,
    loading: false,
    markRead: vi.fn(),
    markAllRead,
    clear,
    dismiss: vi.fn(),
  }),
}));

// The approvals row is exercised in its own suite; stub it to a marker here.
vi.mock('@/components/approvals-drawer', () => ({
  PendingRow: ({ approval }: { approval: PendingApproval }) => <div>row:{approval.id}</div>,
}));

import { NotificationsPanel } from './notifications-panel';

const approval = (id: string): PendingApproval => ({ id }) as PendingApproval;

const decide = vi.fn();
const onClose = vi.fn();

afterEach(() => {
  markAllRead.mockReset();
  clear.mockReset();
  decide.mockReset();
  onClose.mockReset();
});

describe('NotificationsPanel', () => {
  it('defaults to the notifications tab with the mark-all-read/clear actions', () => {
    render(<NotificationsPanel onClose={onClose} pending={[]} decide={decide} />);
    expect(screen.getByRole('tab', { name: /Notifications/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Mark all read' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear notifications' })).toBeInTheDocument();
  });

  it('switches to approvals: hides the notifications actions and shows the inbox', () => {
    render(
      <NotificationsPanel onClose={onClose} pending={[approval('p1')]} decide={decide} />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Approvals/ }));

    expect(screen.getByRole('tab', { name: /Approvals/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // Notifications-only actions are gone on the approvals tab.
    expect(screen.queryByRole('button', { name: 'Mark all read' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear notifications' })).toBeNull();
    // The pending row renders.
    expect(screen.getByText('row:p1')).toBeInTheDocument();
  });

  it('shows the empty state on the approvals tab when there is nothing pending', () => {
    render(<NotificationsPanel onClose={onClose} pending={[]} decide={decide} />);
    fireEvent.click(screen.getByRole('tab', { name: /Approvals/ }));
    expect(screen.getByText('No pending approvals')).toBeInTheDocument();
  });
});
