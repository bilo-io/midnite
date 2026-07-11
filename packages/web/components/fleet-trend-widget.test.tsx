import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GaugeHistoryResponse, GaugeSample } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getGaugeHistory = vi.fn();
vi.mock('@/lib/api', () => ({
  getGaugeHistory: (...args: unknown[]) => getGaugeHistory(...args),
}));

import { FleetTrendWidget } from './fleet-trend-widget';

function sample(at: string, queueDepth: number): GaugeSample {
  return { at, queueDepth, slotsUsed: 1, slotsTotal: 4, tickLatencyMs: 5 };
}

function response(samples: GaugeSample[]): GaugeHistoryResponse {
  return { samples, truncated: false };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FleetTrendWidget', () => {
  const noop = () => {};

  it('renders the chosen series chart from samples', async () => {
    getGaugeHistory.mockResolvedValue(
      response([sample('2026-07-01T10:00:00.000Z', 2), sample('2026-07-01T10:05:00.000Z', 3)]),
    );
    render(withQueryClient(<FleetTrendWidget config={{ series: 'queueDepth' }} onConfigChange={noop} />));

    await waitFor(() => expect(screen.getByLabelText('Queue depth chart')).toBeInTheDocument());
  });

  it('shows the honest empty state when there are no samples', async () => {
    getGaugeHistory.mockResolvedValue(response([]));
    render(withQueryClient(<FleetTrendWidget config={{ series: 'queueDepth' }} onConfigChange={noop} />));

    await waitFor(() => expect(screen.getByText(/No gauge history yet/)).toBeInTheDocument());
  });

  it('calls onConfigChange when the series select changes', async () => {
    getGaugeHistory.mockResolvedValue(response([sample('2026-07-01T10:00:00.000Z', 2)]));
    const onConfigChange = vi.fn();
    render(withQueryClient(<FleetTrendWidget config={{ series: 'queueDepth' }} onConfigChange={onConfigChange} />));

    await waitFor(() => expect(screen.getByLabelText('Queue depth chart')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Fleet series'), { target: { value: 'slotsUsed' } });
    expect(onConfigChange).toHaveBeenCalledWith({ series: 'slotsUsed' });
  });
});
