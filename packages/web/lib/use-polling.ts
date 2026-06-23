'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

type PollingState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

let _keyCounter = 0;

/**
 * Fetch on mount and on a fixed interval, now backed by TanStack Query (Phase 3).
 * Same external API as before — callers don't need to change.
 *
 * `refetchInterval` replaces the hand-rolled `setInterval`; `invalidateData()`
 * still provides on-demand cross-component invalidation via the QueryClient.
 */
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbitrary dep list, like useEffect
  deps: readonly any[] = [],
): PollingState<T> {
  const keyPrefixRef = useRef<number | null>(null);
  if (keyPrefixRef.current === null) keyPrefixRef.current = _keyCounter++;

  const queryKey = [keyPrefixRef.current, ...deps];

  const { data, error, isFetching, isPending, refetch } = useQuery<T>({
    queryKey,
    queryFn: ({ signal }) => fetcher(signal),
    refetchInterval: intervalMs,
  });

  return {
    data: data ?? null,
    error: error ? (error instanceof Error ? error.message : 'request failed') : null,
    loading: isPending || isFetching,
    refresh: () => void refetch(),
  };
}
