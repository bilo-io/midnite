'use client';

import { useQuery } from '@tanstack/react-query';
import type { SystemStats } from '@midnite/shared';
import { getSystemStats } from '@/lib/api';

// How often to poll the gateway for a fresh host sample.
export const SYSTEM_POLL_MS = 2_000;

export type SystemStatsState = {
  stats: SystemStats | null;
  /** True until the first successful sample resolves. */
  loading: boolean;
  /** True once a request has failed and no sample is available. */
  error: boolean;
};

/**
 * Shared host-telemetry query (`GET /system/stats`). Every caller uses the same
 * query key, so mounting the System-monitor widget, the Disk widget, and the
 * screensaver readout together still polls the host just once. Pauses while the
 * tab is backgrounded.
 */
export function useSystemStats(): SystemStatsState {
  const { data, isPending, isError } = useQuery({
    queryKey: ['system-stats'],
    queryFn: ({ signal }) => getSystemStats(signal),
    refetchInterval: SYSTEM_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: SYSTEM_POLL_MS,
  });

  return {
    stats: data ?? null,
    loading: isPending && !data,
    error: isError && !data,
  };
}
