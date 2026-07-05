/**
 * Global data invalidation — backed by TanStack Query (Phase 3), coalesced
 * (Phase 57 E — refetch/cache tuning).
 *
 * Every board WebSocket event calls `invalidateData()`. Firing an immediate
 * `invalidateQueries()` per event meant a burst of N events triggered N full
 * board refetches — a "refetch storm". We now debounce with a **leading +
 * trailing** edge: the first call in a quiet period refetches immediately (so a
 * single mutation still feels instant), and any further calls inside the window
 * coalesce into one trailing refetch — so N rapid events cost ~2 refetches, not
 * N. The WebSocket stays the freshness signal; a sane `staleTime` (see
 * `query-client`) lets incidental refetches coalesce too.
 *
 * Granular per-channel invalidation (`task.*` → only the task list) is left to
 * Phase 56's per-event-type cache strategy over sequenced events — doing it here
 * would fork a second cache layer against not-yet-sequenced payloads. This slice
 * only bounds *how often* the existing global invalidation fires.
 */
import { queryClient } from './query-client';

/** Coalescing window for burst invalidations (ms). */
export const INVALIDATE_DEBOUNCE_MS = 300;

let windowTimer: ReturnType<typeof setTimeout> | undefined;
let trailingPending = false;

/**
 * Mark every active query stale and trigger a background refetch, coalescing
 * bursts via a leading + trailing debounce over {@link INVALIDATE_DEBOUNCE_MS}.
 */
export function invalidateData(): void {
  if (windowTimer === undefined) {
    // Leading edge — refresh now and open a coalescing window.
    void queryClient.invalidateQueries();
    windowTimer = setTimeout(closeWindow, INVALIDATE_DEBOUNCE_MS);
  } else {
    // Inside the window — coalesce; we now owe exactly one trailing refresh.
    trailingPending = true;
  }
}

function closeWindow(): void {
  windowTimer = undefined;
  if (trailingPending) {
    trailingPending = false;
    // Trailing edge — flush the coalesced burst. Re-entering re-opens a window
    // so a still-ongoing stream keeps coalescing instead of firing per-event.
    invalidateData();
  }
}

/** @deprecated No-op — TanStack Query handles subscriptions internally. */
export function useDataRefresh(_refresh: () => void): void {
  // intentionally empty
}
