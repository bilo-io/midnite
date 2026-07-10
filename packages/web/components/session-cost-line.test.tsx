import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { UsageAttributionResponse } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getUsageAttribution = vi.fn();
vi.mock('@/lib/api', () => ({
  getUsageAttribution: (...args: unknown[]) => getUsageAttribution(...args),
}));

import { SessionCostLine } from './session-cost-line';

function response(sessionId: string | null): UsageAttributionResponse {
  return {
    from: null,
    to: null,
    groupBy: 'session',
    totals: {
      sessions: 1,
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 0,
      estCostUsd: 1.25,
      measuredCostUsd: 1.25,
      estimatedCostUsd: 0,
      unpricedSessions: 0,
    },
    buckets: sessionId
      ? [
          {
            key: sessionId,
            label: null,
            sessions: 1,
            inputTokens: 100,
            outputTokens: 50,
            cachedTokens: 0,
            estCostUsd: 1.25,
            measuredCostUsd: 1.25,
            estimatedCostUsd: 0,
            unpricedSessions: 0,
          },
        ]
      : [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SessionCostLine', () => {
  it('renders the session cost with a measured label', async () => {
    getUsageAttribution.mockResolvedValue(response('sess-1'));
    render(withQueryClient(<SessionCostLine sessionId="sess-1" />));

    await waitFor(() => expect(screen.getByText('Cost')).toBeInTheDocument());
    expect(screen.getByText('$1.25')).toBeInTheDocument();
    expect(screen.getByText(/measured/)).toBeInTheDocument();
  });

  it('shows a quiet dash when the session has no cost bucket', async () => {
    getUsageAttribution.mockResolvedValue(response(null));
    render(withQueryClient(<SessionCostLine sessionId="sess-1" />));

    await waitFor(() => expect(screen.getByText('Cost')).toBeInTheDocument());
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
