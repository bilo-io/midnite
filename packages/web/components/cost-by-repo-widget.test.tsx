import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UsageAttributionResponse } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getUsageAttribution = vi.fn();
vi.mock('@/lib/api', () => ({
  getUsageAttribution: (...args: unknown[]) => getUsageAttribution(...args),
}));

import { CostByRepoWidget } from './cost-by-repo-widget';

function bucket(key: string, measured: number, estimated: number): UsageAttributionResponse['buckets'][number] {
  return {
    key,
    label: key,
    sessions: 3,
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 10,
    estCostUsd: measured + estimated,
    measuredCostUsd: measured,
    estimatedCostUsd: estimated,
    unpricedSessions: 0,
  };
}

function response(buckets: UsageAttributionResponse['buckets']): UsageAttributionResponse {
  const sum = (f: (b: UsageAttributionResponse['buckets'][number]) => number) =>
    buckets.reduce((s, b) => s + f(b), 0);
  return {
    from: '2026-06-01T00:00:00.000Z',
    to: '2026-07-01T00:00:00.000Z',
    groupBy: 'repo',
    totals: {
      sessions: sum((b) => b.sessions),
      inputTokens: sum((b) => b.inputTokens),
      outputTokens: sum((b) => b.outputTokens),
      cachedTokens: sum((b) => b.cachedTokens),
      estCostUsd: sum((b) => b.estCostUsd),
      measuredCostUsd: sum((b) => b.measuredCostUsd),
      estimatedCostUsd: sum((b) => b.estimatedCostUsd),
      unpricedSessions: 0,
    },
    buckets,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CostByRepoWidget', () => {
  const noop = () => {};

  it('renders the total and repo bars from data', async () => {
    getUsageAttribution.mockResolvedValue(response([bucket('web', 1.5, 0.5), bucket('gateway', 1, 0)]));
    render(withQueryClient(<CostByRepoWidget config={{ windowDays: 30 }} onConfigChange={noop} />));

    await waitFor(() => expect(screen.getByText('$3.00')).toBeInTheDocument());
    expect(screen.getByLabelText('Cost by repo chart')).toBeInTheDocument();
  });

  it('shows the honest empty state when there are no buckets', async () => {
    getUsageAttribution.mockResolvedValue(response([]));
    render(withQueryClient(<CostByRepoWidget config={{ windowDays: 30 }} onConfigChange={noop} />));

    await waitFor(() => expect(screen.getByText(/No session cost recorded yet/)).toBeInTheDocument());
  });

  it('calls onConfigChange when the window select changes', async () => {
    getUsageAttribution.mockResolvedValue(response([bucket('web', 1, 0)]));
    const onConfigChange = vi.fn();
    render(withQueryClient(<CostByRepoWidget config={{ windowDays: 30 }} onConfigChange={onConfigChange} />));

    await waitFor(() => expect(screen.getByText('$1.00')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Cost window'), { target: { value: '7' } });
    expect(onConfigChange).toHaveBeenCalledWith({ windowDays: 7 });
  });
});
