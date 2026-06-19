'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDataRefresh } from './data-refresh';

type ApiDataState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

/**
 * Fetch once on mount (and on demand via `refresh`), cancelling in-flight work
 * on unmount. Unlike {@link usePolling} there's no interval — it's the static
 * export's replacement for what used to be a server-component `await` in the
 * page shell: the page renders as a client component and loads its data here.
 *
 * `fetcher` receives an AbortSignal; pass it through to `fetch` where supported.
 */
export function useApiData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbitrary dep list, like useEffect
  deps: readonly any[] = [],
): ApiDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Re-fetch when any mutation calls invalidateData() — see lib/data-refresh.ts.
  useDataRefresh(refresh);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const result = await fetcherRef.current(controller.signal);
        if (!active) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'request failed');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-supplied dep list
  }, [tick, ...deps]);

  return { data, error, loading, refresh };
}
