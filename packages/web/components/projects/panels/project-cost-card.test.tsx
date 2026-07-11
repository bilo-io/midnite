import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { CycleTimeResponse, UsageAttributionResponse } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getUsageAttribution = vi.fn();
const getCycleTime = vi.fn();
vi.mock('@/lib/api', () => ({
  getUsageAttribution: (...args: unknown[]) => getUsageAttribution(...args),
  getCycleTime: (...args: unknown[]) => getCycleTime(...args),
}));

import { ProjectCostCard } from './project-cost-card';

function attribution(projectId: string): UsageAttributionResponse {
  return {
    from: null,
    to: null,
    groupBy: 'project',
    totals: {
      sessions: 2,
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 0,
      estCostUsd: 2.5,
      measuredCostUsd: 2,
      estimatedCostUsd: 0.5,
      unpricedSessions: 0,
    },
    buckets: [
      {
        key: projectId,
        label: 'Alpha',
        sessions: 2,
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 0,
        estCostUsd: 2.5,
        measuredCostUsd: 2,
        estimatedCostUsd: 0.5,
        unpricedSessions: 0,
      },
    ],
  };
}

function cycle(projectId: string): CycleTimeResponse {
  return {
    from: '2026-06-01T00:00:00.000Z',
    to: '2026-07-01T00:00:00.000Z',
    groupBy: 'project',
    groups: [
      {
        key: projectId,
        taskCount: 4,
        wait: { p50Ms: 60_000, p90Ms: 120_000, count: 4 },
        work: { p50Ms: 600_000, p90Ms: 1_200_000, count: 4 },
        endToEnd: { p50Ms: 900_000, p90Ms: 1_800_000, count: 4 },
        retryOverheadMsTotal: 0,
        tasksWithRetries: 0,
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProjectCostCard', () => {
  it('renders spend, sessions and a p50 end-to-end stat for the project bucket', async () => {
    getUsageAttribution.mockResolvedValue(attribution('proj-1'));
    getCycleTime.mockResolvedValue(cycle('proj-1'));
    render(withQueryClient(<ProjectCostCard projectId="proj-1" />));

    await waitFor(() => expect(screen.getByText('$2.50')).toBeInTheDocument());
    expect(screen.getByText('p50 end-to-end')).toBeInTheDocument();
    expect(screen.getByText('15m')).toBeInTheDocument();
  });

  it('shows the empty state when the project has no cost bucket', async () => {
    getUsageAttribution.mockResolvedValue(attribution('other'));
    getCycleTime.mockResolvedValue(cycle('other'));
    render(withQueryClient(<ProjectCostCard projectId="proj-1" />));

    await waitFor(() =>
      expect(screen.getByText(/No agent-session cost recorded yet/)).toBeInTheDocument(),
    );
  });
});
