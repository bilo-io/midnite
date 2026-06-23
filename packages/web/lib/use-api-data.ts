'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

type ApiDataState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

let _keyCounter = 0;

/**
 * Fetch once on mount (and on demand via `refresh` or via `invalidateData`),
 * now backed by TanStack Query (Phase 3). Same external API as before —
 * callers don't need to change.
 *
 * Each mounted instance gets its own stable query key so queries are
 * independent; `invalidateData()` broadcasts a global invalidation that hits
 * all active queries at once (matching the old pub/sub behaviour).
 */
export function useApiData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbitrary dep list, like useEffect
  deps: readonly any[] = [],
): ApiDataState<T> {
  // Stable per-instance key prefix assigned once on first render.
  const keyPrefixRef = useRef<number | null>(null);
  if (keyPrefixRef.current === null) keyPrefixRef.current = _keyCounter++;

  const queryKey = [keyPrefixRef.current, ...deps];

  const { data, error, isFetching, isPending, refetch } = useQuery<T>({
    queryKey,
    queryFn: ({ signal }) => fetcher(signal),
  });

  return {
    data: data ?? null,
    error: error ? (error instanceof Error ? error.message : 'request failed') : null,
    loading: isPending || isFetching,
    refresh: () => void refetch(),
  };
}
