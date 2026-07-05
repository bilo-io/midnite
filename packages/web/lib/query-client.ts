import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient — shared between `QueryClientProvider` (in the layout)
 * and `invalidateData()` (called from mutations outside React). Keeping it in a
 * module ensures both sides reference the same instance.
 *
 * Config (Phase 57 E — refetch/cache tuning):
 *  - `staleTime: 5s` — a WebSocket event (via the debounced `invalidateData`) is
 *    the primary freshness signal, so incidental refetches (remount, focus)
 *    within a few seconds coalesce against fresh cache instead of re-hitting the
 *    gateway. Was `0`, which made every mount/focus a fresh fetch.
 *  - `refetchOnWindowFocus: true` — refetch a stale query when the tab regains
 *    focus, a safety net for events missed while backgrounded (until Phase 56
 *    makes the board WS lossless). With the 5s staleTime this can't storm.
 *  - `retry: false` — unchanged; the app surfaces errors rather than retrying.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: false,
      refetchOnWindowFocus: true,
    },
  },
});
