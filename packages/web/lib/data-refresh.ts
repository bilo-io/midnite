'use client';

import { useEffect } from 'react';

/**
 * A tiny pub/sub so a mutation anywhere can force every live data hook to
 * re-fetch — our stand-in for TanStack Query's `invalidateQueries`.
 *
 * Why this exists: the web app is a static export (`output: 'export'`), so all
 * data is fetched client-side via {@link useApiData}/{@link usePolling}. Next's
 * `router.refresh()` only re-runs *server* components, of which a static export
 * has none — so calling it after a create/delete did nothing, leaving the UI
 * showing stale (or already-deleted) resources until a full page reload.
 *
 * Instead, after any mutation call {@link invalidateData}; every mounted
 * {@link useApiData}/{@link usePolling} hook subscribes and re-runs its fetcher.
 * Invalidation is coarse (all hooks refetch), but only one page is mounted at a
 * time, so the cost is a handful of cheap gateway reads.
 */
const listeners = new Set<() => void>();

/** Tell every live data hook to re-fetch. Call after a successful mutation. */
export function invalidateData(): void {
  for (const listener of listeners) listener();
}

/**
 * Subscribe a re-fetch callback to global invalidation for the lifetime of the
 * component. Used internally by the data hooks; `refresh` must be stable.
 */
export function useDataRefresh(refresh: () => void): void {
  useEffect(() => {
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);
}
