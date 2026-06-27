'use client';

import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';

type ApiDataState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

/**
 * Fetch once on mount (and on demand via `refresh` or via `invalidateData`),
 * now backed by TanStack Query (Phase 3). Same external API as before —
 * callers don't need to change.
 *
 * Each mounted instance gets its own stable query key (from `useId`, tied to
 * the component's position in the tree) so queries are independent and a cache
 * hit is always for the same call site — hence the same data shape. A previous
 * implementation used a module-level counter incremented during render; Next's
 * Fast Refresh resets module state, so after a refresh new hooks re-used low
 * keys and collided with stale cache entries of a *different* shape (e.g. the
 * office hook expecting `[sessions, tasks]` got served a single object →
 * "data is not iterable"). `invalidateData()` still broadcasts a global
 * invalidation that hits all active queries at once.
 */
export function useApiData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbitrary dep list, like useEffect
  deps: readonly any[] = [],
): ApiDataState<T> {
  // Stable per-instance key, derived from the component's tree position.
  const instanceId = useId();

  const queryKey = [instanceId, ...deps];

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
