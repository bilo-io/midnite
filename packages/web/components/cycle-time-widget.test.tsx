import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CycleTimeGroupBy, CycleTimeResponse } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getCycleTime = vi.fn();
vi.mock('@/lib/api', () => ({
  getCycleTime: (...args: unknown[]) => getCycleTime(...args),
}));

import { CycleTimeWidget } from './cycle-time-widget';

const stat = (p50: number | null, p90: number | null, count: number) => ({ p50Ms: p50, p90Ms: p90, count });

function response(taskCount: number): CycleTimeResponse {
  return {
    from: '2026-06-01T00:00:00.000Z',
    to: '2026-07-01T00:00:00.000Z',
    groupBy: 'none',
    groups:
      taskCount === 0
        ? []
        : [
            {
              key: 'all',
              taskCount,
              wait: stat(60_000, 120_000, taskCount),
              work: stat(600_000, 1_200_000, taskCount),
              endToEnd: stat(900_000, 1_800_000, taskCount),
              retryOverheadMsTotal: 30_000,
              tasksWithRetries: 1,
            },
          ],
  };
}

const config = { windowDays: 30, groupBy: 'none' as CycleTimeGroupBy };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CycleTimeWidget', () => {
  const noop = () => {};

  it('renders the chart and completed-task count from data', async () => {
    getCycleTime.mockResolvedValue(response(8));
    render(withQueryClient(<CycleTimeWidget config={config} onConfigChange={noop} />));

    await waitFor(() => expect(screen.getByLabelText('Cycle-time chart')).toBeInTheDocument());
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(/Retry overhead/)).toBeInTheDocument();
  });

  it('shows the honest empty state when no tasks completed', async () => {
    getCycleTime.mockResolvedValue(response(0));
    render(withQueryClient(<CycleTimeWidget config={config} onConfigChange={noop} />));

    await waitFor(() => expect(screen.getByText(/No completed tasks in this window yet/)).toBeInTheDocument());
  });

  it('calls onConfigChange when the group-by select changes', async () => {
    getCycleTime.mockResolvedValue(response(4));
    const onConfigChange = vi.fn();
    render(withQueryClient(<CycleTimeWidget config={config} onConfigChange={onConfigChange} />));

    await waitFor(() => expect(screen.getByLabelText('Cycle-time chart')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Group cycle-time by'), { target: { value: 'repo' } });
    expect(onConfigChange).toHaveBeenCalledWith({ windowDays: 30, groupBy: 'repo' });
  });
});
