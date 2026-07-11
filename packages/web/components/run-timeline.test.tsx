import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { RunTimelineEntry, RunTimelineResponse } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getRunTimeline = vi.fn();
vi.mock('@/lib/api', () => ({
  getRunTimeline: (...args: unknown[]) => getRunTimeline(...args),
}));

import { RunTimeline } from './run-timeline';

function run(over: Partial<RunTimelineEntry> = {}): RunTimelineEntry {
  return {
    id: 'r1',
    taskId: 't1',
    startedAt: '2026-06-01T00:00:00.000Z',
    endedAt: '2026-06-01T00:01:00.000Z',
    durationMs: 60_000,
    outcome: 'done',
    retryCount: 0,
    repo: 'web',
    ...over,
  };
}

function response(runs: RunTimelineEntry[]): RunTimelineResponse {
  return { taskId: 't1', runs };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RunTimeline', () => {
  it('renders the chart, run count, and outcome legend for N runs', async () => {
    getRunTimeline.mockResolvedValue(
      response([
        run({ id: 'r1', outcome: 'done', retryCount: 0 }),
        run({ id: 'r2', outcome: 'failed', retryCount: 1, startedAt: '2026-06-01T00:02:00.000Z' }),
      ]),
    );
    render(withQueryClient(<RunTimeline taskId="t1" />));

    await waitFor(() => expect(screen.getByLabelText('Run timeline chart')).toBeInTheDocument());
    expect(getRunTimeline).toHaveBeenCalledWith('t1');
    // Count caption + one legend swatch per present outcome.
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    // A finished-only strip never labels a running attempt.
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });

  it('shows the honest empty state when there are no runs', async () => {
    getRunTimeline.mockResolvedValue(response([]));
    render(withQueryClient(<RunTimeline taskId="t1" />));

    await waitFor(() => expect(screen.getByText('No agent runs recorded yet.')).toBeInTheDocument());
    expect(screen.queryByLabelText('Run timeline chart')).not.toBeInTheDocument();
  });

  it('labels a live run as running', async () => {
    getRunTimeline.mockResolvedValue(
      response([
        run({ id: 'r1', outcome: 'done', retryCount: 0 }),
        run({
          id: 'r2',
          startedAt: '2026-06-01T00:02:00.000Z',
          endedAt: null,
          durationMs: null,
          outcome: null,
          retryCount: 1,
        }),
      ]),
    );
    render(withQueryClient(<RunTimeline taskId="t1" />));

    await waitFor(() => expect(screen.getByText('Running')).toBeInTheDocument());
    expect(screen.getByLabelText('Run timeline chart')).toBeInTheDocument();
  });
});
