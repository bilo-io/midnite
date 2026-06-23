/**
 * Global data invalidation — now backed by TanStack Query (Phase 3).
 *
 * Calling `invalidateData()` marks every active query as stale and triggers an
 * immediate background refetch, exactly matching the old pub/sub behaviour.
 * `useDataRefresh` is kept as a no-op for backward compatibility (the new hooks
 * don't need it — TanStack handles the subscription lifecycle internally).
 */
import { queryClient } from './query-client';

/** Mark every active query stale and trigger a background refetch. */
export function invalidateData(): void {
  void queryClient.invalidateQueries();
}

/** @deprecated No-op — TanStack Query handles subscriptions internally. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useDataRefresh(_refresh: () => void): void {
  // intentionally empty
}

