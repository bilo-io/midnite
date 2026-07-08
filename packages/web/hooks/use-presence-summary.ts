'use client';

import { useQuery } from '@tanstack/react-query';
import type { PresenceSummary } from '@midnite/shared';
import { getPresenceSummary } from '@/lib/api';

const EMPTY: PresenceSummary = { count: 0, peers: [] };

/**
 * Phase 64 Theme F — app-wide "who's in the office" poll. Backs the nav pill +
 * dashboard widget from anywhere without holding a presence socket (the office
 * WS is per-view). Polls `GET /presence/summary` on a gentle cadence; returns an
 * empty summary until the first response.
 */
export function usePresenceSummary(enabled = true): PresenceSummary {
  const { data } = useQuery({
    queryKey: ['presence-summary'],
    queryFn: ({ signal }) => getPresenceSummary(signal),
    refetchInterval: 12_000,
    enabled,
  });
  return data ?? EMPTY;
}
