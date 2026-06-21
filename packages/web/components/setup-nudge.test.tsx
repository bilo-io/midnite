import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SetupItem, SetupItemState, SetupStatus } from '@midnite/shared';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

// next/link needs an App Router context; a plain anchor is enough here.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/api', () => ({ getSetupStatus: vi.fn() }));
import { getSetupStatus } from '@/lib/api';
import { SetupNudge } from './setup-nudge';

const mockGetSetupStatus = vi.mocked(getSetupStatus);

function makeStatus(states: Partial<Record<SetupItem['id'], SetupItemState>> = {}): SetupStatus {
  const base: Record<SetupItem['id'], SetupItemState> = {
    provider: 'missing',
    'secret-key': 'missing',
    'agent-cli': 'ok',
    'agent-pool': 'warn',
    repo: 'warn',
    ...states,
  };
  const items: SetupItem[] = (Object.keys(base) as SetupItem['id'][]).map((id) => ({
    id,
    label: id,
    state: base[id],
  }));
  return { items, ready: false };
}

describe('SetupNudge', () => {
  beforeEach(() => {
    pathname = '/';
    sessionStorage.clear();
    mockGetSetupStatus.mockReset();
  });

  it('shows the checklist + a CTA when setup is not ready', async () => {
    mockGetSetupStatus.mockResolvedValue(makeStatus());
    render(<SetupNudge />);

    await screen.findByRole('region', { name: /finish setting up midnite/i });
    expect(screen.getByText('2 steps left before agents can run.')).toBeInTheDocument();
    // First missing item (provider) drives the primary CTA → settings/agents.
    const cta = screen.getByRole('link', { name: /set up provider/i });
    expect(cta).toHaveAttribute('href', '/settings/agents');
    // A missing row deep-links into the right surface.
    expect(screen.getByRole('link', { name: /secret-key/i })).toHaveAttribute('href', '/settings/system');
  });

  it('renders nothing once the install is ready', async () => {
    mockGetSetupStatus.mockResolvedValue({ ...makeStatus(), ready: true });
    render(<SetupNudge />);
    await waitFor(() => expect(mockGetSetupStatus).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: /finish setting up/i })).toBeNull();
  });

  it('stays out of the way on settings routes (Theme D owns that view)', async () => {
    pathname = '/settings/agents';
    mockGetSetupStatus.mockResolvedValue(makeStatus());
    render(<SetupNudge />);
    await waitFor(() => expect(mockGetSetupStatus).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: /finish setting up/i })).toBeNull();
  });

  it('dismiss hides it and persists for the session', async () => {
    mockGetSetupStatus.mockResolvedValue(makeStatus());
    const { unmount } = render(<SetupNudge />);

    await screen.findByRole('region', { name: /finish setting up/i });
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('region', { name: /finish setting up/i })).toBeNull();
    expect(sessionStorage.getItem('midnite.setup-nudge.dismissed')).toBe('true');

    // A remount in the same session honours the dismiss.
    unmount();
    render(<SetupNudge />);
    await waitFor(() => expect(mockGetSetupStatus).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('region', { name: /finish setting up/i })).toBeNull();
  });

  it('fails open: a fetch error renders nothing', async () => {
    mockGetSetupStatus.mockRejectedValue(new Error('gateway down'));
    render(<SetupNudge />);
    await waitFor(() => expect(mockGetSetupStatus).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: /finish setting up/i })).toBeNull();
  });
});
