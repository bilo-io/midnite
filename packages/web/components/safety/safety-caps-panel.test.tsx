import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { GuardrailCaps } from '@midnite/shared';

const getGuardrailCaps = vi.fn();
vi.mock('@/lib/api', () => ({ getGuardrailCaps: () => getGuardrailCaps() }));

import { SafetyCapsPanel } from './safety-caps-panel';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const caps: GuardrailCaps = {
  mode: 'guarded',
  hardDailyCapUsd: 25,
  hardMonthlyCapUsd: null,
  softDailyBudgetUsd: null,
  softMonthlyBudgetUsd: 500,
  maxSpawnsPerHour: 10,
  blastRadiusEnabled: true,
  protectedBranches: ['main', 'master'],
  protectedPathGlobs: ['**/.env'],
  scrubSpawnEnv: false,
};

describe('SafetyCapsPanel', () => {
  it('renders configured caps + protected actions read-only', async () => {
    getGuardrailCaps.mockResolvedValue(caps);
    render(<SafetyCapsPanel />);

    await waitFor(() => expect(screen.getByText('$25')).toBeInTheDocument());
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('10/hour')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('**/.env')).toBeInTheDocument();
    // Unset hard-monthly + soft-daily render as "unset".
    expect(screen.getAllByText('unset').length).toBeGreaterThanOrEqual(2);
  });

  it('shows "unlimited" when the rate cap is 0', async () => {
    getGuardrailCaps.mockResolvedValue({ ...caps, maxSpawnsPerHour: 0 });
    render(<SafetyCapsPanel />);
    await waitFor(() => expect(screen.getByText('unlimited')).toBeInTheDocument());
  });

  it('degrades gracefully when caps are unavailable', async () => {
    getGuardrailCaps.mockResolvedValue(null);
    render(<SafetyCapsPanel />);
    await waitFor(() => expect(screen.getByText(/Couldn’t load the configured caps/)).toBeInTheDocument());
  });
});
