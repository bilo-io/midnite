import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { PreflightReport, Readiness } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getReadiness = vi.fn();
const getPreflight = vi.fn();
vi.mock('@/lib/api', () => ({
  getReadiness: () => getReadiness(),
  getPreflight: () => getPreflight(),
}));

import { RuntimeHealthPanel } from './runtime-health-panel';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const READY: Readiness = {
  ready: true,
  worst: 'ok',
  checks: [
    { name: 'database', status: 'ok', detail: 'writable + migrated' },
    { name: 'spawner', status: 'ok', detail: "terminal backend 'pty' is available" },
  ],
  uptimeMs: 3_600_000,
};
const PREFLIGHT: PreflightReport = {
  ok: true,
  worst: 'warn',
  checks: [
    { name: 'config', status: 'ok', detail: 'parsed midnite.json' },
    { name: 'gh-cli', status: 'warn', detail: '`gh` not on PATH', remedy: 'install the GitHub CLI' },
  ],
};

describe('RuntimeHealthPanel', () => {
  it('renders the readiness badge, uptime, and the preflight checks', async () => {
    getReadiness.mockResolvedValue(READY);
    getPreflight.mockResolvedValue(PREFLIGHT);
    render(withQueryClient(<RuntimeHealthPanel />));

    await waitFor(() => expect(screen.getByText('Ready')).toBeInTheDocument());
    expect(screen.getByText('1h 0m')).toBeInTheDocument(); // uptime
    expect(screen.getByText('config')).toBeInTheDocument();
    expect(screen.getByText('gh-cli')).toBeInTheDocument();
    // a warn check surfaces its remedy
    expect(screen.getByText(/install the GitHub CLI/)).toBeInTheDocument();
  });

  it('shows "Not ready" when readiness fails', async () => {
    getReadiness.mockResolvedValue({ ...READY, ready: false, worst: 'fail' });
    getPreflight.mockResolvedValue(PREFLIGHT);
    render(withQueryClient(<RuntimeHealthPanel />));

    await waitFor(() => expect(screen.getByText('Not ready')).toBeInTheDocument());
  });

  it('shows an unreachable message when both reads fail', async () => {
    getReadiness.mockRejectedValue(new Error('down'));
    getPreflight.mockRejectedValue(new Error('down'));
    render(withQueryClient(<RuntimeHealthPanel />));

    await waitFor(() => expect(screen.getByText(/Gateway unreachable/)).toBeInTheDocument());
  });
});
