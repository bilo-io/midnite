import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  MetricsRollup,
  MetricsRollupResponse,
  UsageAttributionBucket,
  UsageAttributionResponse,
} from '@midnite/shared';

import { CostTrendSection, CostBreakdownSection } from './ops-cost';

function rollup(partial: Partial<MetricsRollup> = {}): MetricsRollup {
  return {
    key: 'k',
    period: 'daily',
    bucketStart: '2026-07-10T00:00:00.000Z',
    source: 'llm',
    repo: null,
    provider: null,
    model: null,
    runCount: null,
    doneCount: null,
    abandonedCount: null,
    failedCount: null,
    cancelledCount: null,
    totalDurationMs: null,
    retriedRuns: null,
    calls: null,
    inputTokens: null,
    outputTokens: null,
    estCostUsd: null,
    avgQueueDepth: null,
    avgSlotsUsed: null,
    avgTickLatencyMs: null,
    sampleCount: null,
    ...partial,
  };
}
function rollups(rows: MetricsRollup[]): MetricsRollupResponse {
  return { period: 'daily', from: 'a', to: 'b', rows };
}

function bucket(partial: Partial<UsageAttributionBucket> = {}): UsageAttributionBucket {
  return {
    key: 'k',
    label: null,
    sessions: 1,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    estCostUsd: 0,
    measuredCostUsd: 0,
    estimatedCostUsd: 0,
    unpricedSessions: 0,
    ...partial,
  };
}
function attribution(buckets: UsageAttributionBucket[]): UsageAttributionResponse {
  return {
    from: 'a',
    to: 'b',
    groupBy: 'repo',
    totals: {
      sessions: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      estCostUsd: 0,
      measuredCostUsd: 0,
      estimatedCostUsd: 0,
      unpricedSessions: 0,
    },
    buckets,
  };
}

describe('CostTrendSection', () => {
  it('sums llm + session cost across the window and shows the honesty legend', () => {
    const data = rollups([
      rollup({ bucketStart: '2026-07-10T00:00:00.000Z', source: 'llm', estCostUsd: 1.5 }),
      rollup({ bucketStart: '2026-07-10T00:00:00.000Z', source: 'session', estCostUsd: 2.5 }),
    ]);
    render(<CostTrendSection data={data} loading={false} />);
    // $4.00 total in window (llm 1.5 + session 2.5)
    expect(screen.getByText('$4.00')).toBeInTheDocument();
    expect(screen.getByText('Session (measured)')).toBeInTheDocument();
    expect(screen.getByText('Session (estimated)')).toBeInTheDocument();
  });

  it('ignores non-cost rollup sources (runs/gauge)', () => {
    const data = rollups([
      rollup({ source: 'runs', runCount: 5, estCostUsd: null }),
      rollup({ source: 'gauge', avgQueueDepth: 3, estCostUsd: null }),
    ]);
    render(<CostTrendSection data={data} loading={false} />);
    // No priced rows → empty state, no $ total chip.
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });

  it('shows an empty state with no rollups', () => {
    render(<CostTrendSection data={rollups([])} loading={false} />);
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });
});

describe('CostBreakdownSection', () => {
  it('renders the group-by selector with repo/project/provider', () => {
    render(
      <CostBreakdownSection
        groupBy="repo"
        onGroupByChange={() => {}}
        attribution={attribution([bucket({ key: 'app', label: 'app', measuredCostUsd: 1 })])}
        rollups={null}
        loading={false}
      />,
    );
    const select = screen.getByRole('combobox', { name: /group cost by/i });
    expect(select).toHaveValue('repo');
    expect(screen.getByRole('option', { name: 'By repo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'By project' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'By provider' })).toBeInTheDocument();
  });

  it('surfaces unpriced sessions from attribution buckets', () => {
    render(
      <CostBreakdownSection
        groupBy="repo"
        onGroupByChange={() => {}}
        attribution={attribution([
          bucket({ key: 'app', label: 'app', measuredCostUsd: 2, unpricedSessions: 3 }),
        ])}
        rollups={null}
        loading={false}
      />,
    );
    expect(screen.getByText(/unpriced sessions/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('derives provider bars from rollup cost when grouped by provider', () => {
    render(
      <CostBreakdownSection
        groupBy="provider"
        onGroupByChange={() => {}}
        attribution={null}
        rollups={rollups([
          rollup({ source: 'llm', provider: 'anthropic', estCostUsd: 5 }),
          rollup({ source: 'session', provider: 'anthropic', estCostUsd: 1 }),
        ])}
        loading={false}
      />,
    );
    // anthropic bar present → not empty
    expect(screen.queryByText(/no data yet/i)).not.toBeInTheDocument();
    expect(screen.getByText('Measured')).toBeInTheDocument();
  });

  it('fires onGroupByChange when the selector changes', () => {
    const onChange = vi.fn();
    render(
      <CostBreakdownSection
        groupBy="repo"
        onGroupByChange={onChange}
        attribution={attribution([bucket({ key: 'app', measuredCostUsd: 1 })])}
        rollups={null}
        loading={false}
      />,
    );
    fireEvent.change(screen.getByRole('combobox', { name: /group cost by/i }), {
      target: { value: 'provider' },
    });
    expect(onChange).toHaveBeenCalledWith('provider');
  });

  it('shows an empty state with no data', () => {
    render(
      <CostBreakdownSection
        groupBy="repo"
        onGroupByChange={() => {}}
        attribution={attribution([])}
        rollups={null}
        loading={false}
      />,
    );
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });
});
