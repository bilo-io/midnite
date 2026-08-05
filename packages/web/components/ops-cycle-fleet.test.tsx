import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import type { CycleTimeGroup, CycleTimeResponse, GaugeHistoryResponse, GaugeSample } from '@midnite/shared';

import { CycleTimeSection, FleetTrendSection } from './ops-cycle-fleet';

function stat(p50: number | null, p90: number | null, count = p50 === null ? 0 : 1) {
  return { p50Ms: p50, p90Ms: p90, count };
}
function group(partial: Partial<CycleTimeGroup> = {}): CycleTimeGroup {
  return {
    key: 'all',
    taskCount: 1,
    wait: stat(3_600_000, 3_600_000),
    work: stat(7_200_000, 7_200_000),
    endToEnd: stat(10_800_000, 10_800_000),
    retryOverheadMsTotal: 0,
    tasksWithRetries: 0,
    ...partial,
  };
}
function cycle(partial: Partial<CycleTimeResponse> = {}): CycleTimeResponse {
  return { from: 'a', to: 'b', groupBy: 'none', groups: [group()], ...partial };
}
function sample(partial: Partial<GaugeSample> = {}): GaugeSample {
  return { at: '2026-07-07T10:00:00.000Z', queueDepth: 2, slotsUsed: 1, slotsTotal: 4, tickLatencyMs: 5, ...partial };
}

// The `formatDuration` cases that lived here moved to `lib/use-unit-format.test.tsx` when
// the local helper folded into the shared `preciseDuration` seam.

describe('CycleTimeSection', () => {
  it('renders the group-by selector with all four options', () => {
    render(<CycleTimeSection data={cycle()} loading={false} groupBy="none" onGroupByChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: /group cycle-time by/i });
    expect(select).toHaveValue('none');
    expect(screen.getByRole('option', { name: 'By repo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'By priority' })).toBeInTheDocument();
  });

  it('reports the completed task count', () => {
    render(
      <CycleTimeSection
        data={cycle({ groups: [group({ taskCount: 5 })] })}
        loading={false}
        groupBy="none"
        onGroupByChange={() => {}}
      />,
    );
    expect(screen.getByText(/completed tasks in window/i)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows the retry-overhead stat only when tasks retried', () => {
    const { rerender } = render(
      <CycleTimeSection data={cycle()} loading={false} groupBy="none" onGroupByChange={() => {}} />,
    );
    expect(screen.queryByText(/retry overhead/i)).not.toBeInTheDocument();

    rerender(
      <CycleTimeSection
        data={cycle({ groups: [group({ retryOverheadMsTotal: 120_000, tasksWithRetries: 3 })] })}
        loading={false}
        groupBy="none"
        onGroupByChange={() => {}}
      />,
    );
    expect(screen.getByText(/retry overhead/i)).toBeInTheDocument();
    expect(screen.getByText(/across 3 tasks/i)).toBeInTheDocument();
  });

  it('fires onGroupByChange when the selector changes', () => {
    const onChange = vi.fn();
    render(<CycleTimeSection data={cycle()} loading={false} groupBy="none" onGroupByChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox', { name: /group cycle-time by/i }), {
      target: { value: 'repo' },
    });
    expect(onChange).toHaveBeenCalledWith('repo');
  });

  it('shows an empty state when no tasks completed', () => {
    render(
      <CycleTimeSection
        data={cycle({ groups: [] })}
        loading={false}
        groupBy="none"
        onGroupByChange={() => {}}
      />,
    );
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });
});

describe('FleetTrendSection', () => {
  it('renders the three trend charts', () => {
    render(<FleetTrendSection data={{ samples: [sample()], truncated: false }} loading={false} />);
    expect(screen.getByText('Queue depth')).toBeInTheDocument();
    expect(screen.getByText('Slots used / total')).toBeInTheDocument();
    expect(screen.getByText('Tick latency (ms)')).toBeInTheDocument();
  });

  it('flags truncated history', () => {
    const data: GaugeHistoryResponse = { samples: [sample()], truncated: true };
    render(<FleetTrendSection data={data} loading={false} />);
    expect(screen.getByText(/showing recent samples/i)).toBeInTheDocument();
  });

  it('shows an empty state with no samples', () => {
    render(<FleetTrendSection data={{ samples: [], truncated: false }} loading={false} />);
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });
});
