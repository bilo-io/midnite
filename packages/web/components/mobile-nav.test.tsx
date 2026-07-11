import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { FEATURES } from '@/lib/features';
import { MobileNav } from './mobile-nav';

// ThemeToggle reads the theme context; NotificationCenter uses useRouter and
// useNotifications — stub all three so the nav can be tested in isolation.
vi.mock('@/app/theme/theme-context', () => ({
  useTheme: () => ({ preference: 'system', resolved: 'dark', setPreference: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/notifications-provider', () => ({
  useNotifications: () => ({ feed: [], unread: 0, loading: false, markRead: vi.fn(), markAllRead: vi.fn(), clear: vi.fn() }),
}));

afterEach(cleanup);

const bar = () => screen.getByRole('navigation', { name: 'Mobile navigation' });
const openMore = () => fireEvent.click(within(bar()).getByRole('button', { name: 'Menu' }));

describe('MobileNav', () => {
  it('renders the first four surfaces as one-tap tabs, with the rest behind More', () => {
    render(<MobileNav pathname="/dashboard" features={FEATURES} onLock={vi.fn()} />);

    const tabs = within(bar()).getAllByRole('link');
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['Dashboard', 'Projects', 'Tasks', 'Slides']);
    expect(within(bar()).getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    // The sheet is closed until tapped.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('marks the active surface with aria-current', () => {
    render(<MobileNav pathname="/tasks" features={FEATURES} onLock={vi.fn()} />);
    expect(within(bar()).getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');
    expect(within(bar()).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('opens a sheet with the overflow surfaces, Settings and Lock', () => {
    render(<MobileNav pathname="/dashboard" features={FEATURES} onLock={vi.fn()} />);
    openMore();

    const sheet = screen.getByRole('dialog', { name: 'Menu' });
    // Sessions/office/… spilled past the four tab slots; Settings always lives here.
    expect(within(sheet).getByRole('link', { name: 'Sessions' })).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: 'Office' })).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Lock' })).toBeInTheDocument();
  });

  it('keeps Settings reachable even when every tab slot is taken by a feature', () => {
    // Only the first four of nine features get a tab — Settings must not be one of them.
    render(<MobileNav pathname="/dashboard" features={FEATURES} onLock={vi.fn()} />);
    expect(within(bar()).queryByRole('link', { name: 'Settings' })).toBeNull();
    openMore();
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });

  it('locks the screen and closes the sheet on Lock', () => {
    const onLock = vi.fn();
    render(<MobileNav pathname="/dashboard" features={FEATURES} onLock={onLock} />);
    openMore();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lock' }));

    expect(onLock).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('flags the active route inside the sheet when it lives in the overflow set', () => {
    render(<MobileNav pathname="/office" features={FEATURES} onLock={vi.fn()} />);
    // Office isn't a tab…
    expect(within(bar()).queryByRole('link', { name: 'Office' })).toBeNull();
    openMore();
    // …it's marked active inside the sheet instead.
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Office' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('closes the sheet on Escape and on navigation', () => {
    const { rerender } = render(<MobileNav pathname="/dashboard" features={FEATURES} onLock={vi.fn()} />);

    openMore();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    openMore();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // A route change is the implicit "tap worked" signal — the sheet dismisses itself.
    rerender(<MobileNav pathname="/sessions" features={FEATURES} onLock={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
