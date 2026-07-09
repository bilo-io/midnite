import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AgentPoolSnapshot, DurationBuckets, MetricsGauges, OpsSummary, OutcomeCounts } from '@midnite/shared';

import {
  DurationSection,
  GaugesSection,
  OutcomesSection,
  SpendSection,
  ThroughputSection,
} from './ops-view';

function gauges(partial: Partial<MetricsGauges> = {}): MetricsGauges {
  return { queueDepth: null, slotsUsed: null, slotsTotal: null, lastTickLatencyMs: null, updatedAt: null, ...partial };
}
function durations(partial: Partial<DurationBuckets> = {}): DurationBuckets {
  return { lt1s: 0, lt5s: 0, lt30s: 0, lt2m: 0, gte2m: 0, ...partial };
}
function outcomes(partial: Partial<OutcomeCounts> = {}): OutcomeCounts {
  return { done: 0, abandoned: 0, failed: 0, cancelled: 0, ...partial };
}
function summary(partial: Partial<OpsSummary> = {}): OpsSummary {
  return {
    gauges: gauges(),
    throughputByDay: [],
    durationBuckets: durations(),
    outcomeCounts: outcomes(),
    ...partial,
  };
}
function pool(partial: Partial<AgentPoolSnapshot> = {}): AgentPoolSnapshot {
  return { slots: [], capacity: 4, busy: 0, queuedTodo: 0, ...partial };
}

// ── GaugesSection ─────────────────────────────────────────────────────────────

describe('GaugesSection', () => {
  it('renders slot utilization bar with aria attributes', () => {
    render(<GaugesSection pool={pool({ busy: 2, capacity: 4 })} summary={null} loading={false} />);
    const bar = screen.getByRole('progressbar', { name: /2 of 4 slots used/ });
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
  });

  it('shows queued todo count', () => {
    render(<GaugesSection pool={pool({ queuedTodo: 5 })} summary={null} loading={false} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows gauge latency when present', () => {
    render(
      <GaugesSection
        pool={pool()}
        summary={summary({ gauges: gauges({ lastTickLatencyMs: 42 }) })}
        loading={false}
      />,
    );
    expect(screen.getByText('42ms')).toBeInTheDocument();
  });

  it('shows loading state when pool and summary are null', () => {
    const { container } = render(<GaugesSection pool={null} summary={null} loading={true} />);
    // WidgetLoader renders a div with items-center class (the spinner wrapper)
    expect(container.querySelector('.items-center')).toBeTruthy();
  });
});

// ── ThroughputSection ─────────────────────────────────────────────────────────

describe('ThroughputSection', () => {
  it('renders total run count', () => {
    render(
      <ThroughputSection
        summary={summary({ throughputByDay: [{ day: '2026-06-20', count: 3 }, { day: '2026-06-21', count: 5 }] })}
        loading={false}
      />,
    );
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('runs in window')).toBeInTheDocument();
  });

  it('shows "No data yet" when throughput is empty', () => {
    render(<ThroughputSection summary={summary({ throughputByDay: [] })} loading={false} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('renders bar chart with day labels', () => {
    render(
      <ThroughputSection
        summary={summary({ throughputByDay: [{ day: '2026-06-20', count: 2 }] })}
        loading={false}
      />,
    );
    expect(screen.getByLabelText('Throughput bar chart')).toBeInTheDocument();
  });
});

// ── DurationSection ───────────────────────────────────────────────────────────

describe('DurationSection', () => {
  it('renders bucket bars', () => {
    render(
      <DurationSection
        summary={summary({ durationBuckets: durations({ lt1s: 10, lt5s: 5, gte2m: 1 }) })}
        loading={false}
      />,
    );
    expect(screen.getByText('<1s')).toBeInTheDocument();
    expect(screen.getByText('≥2m')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows "No data yet" when all buckets are zero', () => {
    render(<DurationSection summary={summary()} loading={false} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});

// ── OutcomesSection ───────────────────────────────────────────────────────────

describe('OutcomesSection', () => {
  it('renders outcome bars with aria labels', () => {
    render(
      <OutcomesSection
        summary={summary({ outcomeCounts: outcomes({ done: 8, abandoned: 2 }) })}
        loading={false}
      />,
    );
    const doneBar = screen.getByRole('progressbar', { name: 'Done: 8' });
    expect(doneBar).toHaveAttribute('aria-valuenow', '8');
    expect(doneBar).toHaveAttribute('aria-valuemax', '10');
  });

  it('shows "No data yet" when all outcomes are zero', () => {
    render(<OutcomesSection summary={summary()} loading={false} />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});

// ── SpendSection ──────────────────────────────────────────────────────────────

const ZERO_USAGE_RESPONSE = {
  from: null,
  to: null,
  groupBy: 'day' as const,
  totals: { calls: 0, inputTokens: 0, outputTokens: 0, estCostUsd: 0 },
  buckets: [],
  byProvider: [],
  byFeature: [],
  warnings: [],
  costIsEstimate: true,
  composition: { llmUsd: 0, sessionMeasuredUsd: 0, sessionEstimatedUsd: 0, unpricedSessions: 0 },
};

function usageBucket(key: string, estCostUsd: number) {
  return { key, calls: 0, inputTokens: 0, outputTokens: 0, estCostUsd };
}

describe('SpendSection', () => {
  it('renders formatted total spend', () => {
    render(
      <SpendSection
        usage={{ ...ZERO_USAGE_RESPONSE, byDay: [usageBucket('2026-06-20', 0.50)] }}
        loading={false}
      />,
    );
    expect(screen.getByText('$0.50')).toBeInTheDocument();
    expect(screen.getByLabelText('LLM spend bar chart')).toBeInTheDocument();
  });

  it('shows "No data yet" when all days have zero spend', () => {
    render(
      <SpendSection
        usage={{ ...ZERO_USAGE_RESPONSE, byDay: [usageBucket('2026-06-20', 0)] }}
        loading={false}
      />,
    );
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('shows <$0.01 for sub-cent spend', () => {
    render(
      <SpendSection
        usage={{ ...ZERO_USAGE_RESPONSE, byDay: [usageBucket('2026-06-20', 0.001)] }}
        loading={false}
      />,
    );
    expect(screen.getByText('<$0.01')).toBeInTheDocument();
  });
});
