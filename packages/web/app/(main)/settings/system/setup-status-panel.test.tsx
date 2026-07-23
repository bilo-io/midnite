import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithIntl as render } from '../../../../vitest.render-intl';
import type { ReactNode } from 'react';
import type { SetupItem, SetupItemState, SetupStatus } from '@midnite/shared';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/api', () => ({ getSetupStatus: vi.fn() }));
import { getSetupStatus } from '@/lib/api';
import { SetupStatusPanel } from './setup-status-panel';

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
    detail: `${id} detail`,
  }));
  return { items, ready: false };
}

describe('SetupStatusPanel', () => {
  beforeEach(() => mockGetSetupStatus.mockReset());

  it('shows every checklist item with a per-item deep-link', async () => {
    mockGetSetupStatus.mockResolvedValue(makeStatus());
    render(<SetupStatusPanel />);

    await screen.findByText('Setup incomplete');
    // A missing item links to its surface with a "Fix" affordance…
    const fix = screen.getAllByRole('link', { name: /fix/i });
    expect(fix.some((l) => l.getAttribute('href') === '/settings/agents')).toBe(true);
    // …and a satisfied item offers "Manage" instead.
    expect(screen.getByRole('link', { name: /manage/i })).toHaveAttribute('href', '/settings/system');
    // All five items render.
    expect(screen.getByText('provider')).toBeInTheDocument();
    expect(screen.getByText('repo')).toBeInTheDocument();
  });

  it('reads Ready when the install is set up', async () => {
    mockGetSetupStatus.mockResolvedValue({
      items: makeStatus().items.map((i) => ({ ...i, state: 'ok' as const })),
      ready: true,
    });
    render(<SetupStatusPanel />);
    expect(await screen.findByText('Ready')).toBeInTheDocument();
    expect(screen.queryByText('Setup incomplete')).toBeNull();
  });

  it('surfaces a retry when the status fails to load', async () => {
    mockGetSetupStatus.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(makeStatus());
    render(<SetupStatusPanel />);

    await screen.findByText(/couldn.t load setup status/i);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.getByText('Setup incomplete')).toBeInTheDocument());
  });

  it('re-checks on demand', async () => {
    mockGetSetupStatus.mockResolvedValue(makeStatus());
    render(<SetupStatusPanel />);
    await screen.findByText('Setup incomplete');
    fireEvent.click(screen.getByRole('button', { name: /re-check/i }));
    await waitFor(() => expect(mockGetSetupStatus).toHaveBeenCalledTimes(2));
  });
});
