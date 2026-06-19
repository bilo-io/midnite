'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDataRefresh } from './data-refresh';

type PollingState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

/**
 * Fetch on mount and on a fixed interval, cancelling in-flight requests on
 * unmount or when `deps` change. Intended for the lightweight dashboard widgets
 * (news, weather) that read from the gateway proxies — TanStack Query isn't wired
 * up yet, so this keeps a single small surface for "fetch + poll + cancel".
 *
 * `fetcher` receives an AbortSignal; pass it through to `fetch` where supported.
 */
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbitrary dep list, like useEffect
  deps: readonly any[] = [],
): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped by refresh() to force a re-run independent of deps.
  const [tick, setTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Re-fetch when any mutation calls invalidateData() — see lib/data-refresh.ts.
  useDataRefresh(refresh);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
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
    };

    void run();
    const id = setInterval(run, intervalMs);

    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-supplied dep list
  }, [intervalMs, tick, ...deps]);

  return { data, error, loading, refresh };
}
