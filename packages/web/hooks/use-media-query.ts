'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { mediaBetween, mediaDown, mediaUp } from '@/lib/breakpoints';

function supportsMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * Subscribe to a CSS media query and re-render when it starts/stops matching.
 *
 * SSR-safe via `useSyncExternalStore`: the server (and the very first client
 * paint) sees `false`, then React reconciles to the real value after hydration
 * without a mismatch warning. Build queries from `lib/breakpoints` rather than
 * hand-writing widths so JS and Tailwind stay on the same cutoffs.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!supportsMatchMedia()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = () => (supportsMatchMedia() ? window.matchMedia(query).matches : false);
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True below the `md` breakpoint (< 768px) — phone-width, single-column surfaces. */
export function useIsMobile(): boolean {
  return useMediaQuery(mediaDown('md'));
}

/** True in the `md`–`lg` range (768–1023px). */
export function useIsTablet(): boolean {
  return useMediaQuery(mediaBetween('md', 'lg'));
}

/** True at the `lg` breakpoint and up (>= 1024px) — full multi-column layout. */
export function useIsDesktop(): boolean {
  return useMediaQuery(mediaUp('lg'));
}
