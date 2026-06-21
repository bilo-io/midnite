import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { mediaDown, mediaUp } from '@/lib/breakpoints';
import { useIsDesktop, useIsMobile, useMediaQuery } from './use-media-query';

type Listener = (event: MediaQueryListEvent) => void;

// A controllable matchMedia: each distinct query string keeps one shared entry
// so `getSnapshot` and the change listener (both call `window.matchMedia`) read
// the same state. `set(query, matches)` flips the value and notifies listeners,
// which is how `useSyncExternalStore` re-renders.
function installMatchMedia(matchesFor: (query: string) => boolean) {
  const original = window.matchMedia;
  const entries = new Map<string, { matches: boolean; listeners: Set<Listener> }>();

  function entryFor(query: string) {
    let entry = entries.get(query);
    if (!entry) {
      entry = { matches: matchesFor(query), listeners: new Set() };
      entries.set(query, entry);
    }
    return entry;
  }

  window.matchMedia = ((query: string) => {
    const entry = entryFor(query);
    return {
      get matches() {
        return entry.matches;
      },
      media: query,
      onchange: null,
      addListener: (l: Listener) => entry.listeners.add(l),
      removeListener: (l: Listener) => entry.listeners.delete(l),
      addEventListener: (_: string, l: Listener) => entry.listeners.add(l),
      removeEventListener: (_: string, l: Listener) => entry.listeners.delete(l),
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;

  return {
    set(query: string, matches: boolean) {
      const entry = entryFor(query);
      entry.matches = matches;
      entry.listeners.forEach((l) => l({ matches } as MediaQueryListEvent));
    },
    restore() {
      window.matchMedia = original;
    },
  };
}

describe('useMediaQuery', () => {
  let mm: ReturnType<typeof installMatchMedia>;

  afterEach(() => mm?.restore());

  it('returns the initial match state for the query', () => {
    mm = installMatchMedia((q) => q === '(min-width: 1024px)');
    expect(renderHook(() => useMediaQuery('(min-width: 1024px)')).result.current).toBe(true);
    expect(renderHook(() => useMediaQuery('(min-width: 9999px)')).result.current).toBe(false);
  });

  it('re-renders when the query starts matching', () => {
    mm = installMatchMedia(() => false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
    act(() => mm.set('(min-width: 1024px)', true));
    expect(result.current).toBe(true);
  });

  it('re-renders when the query stops matching', () => {
    mm = installMatchMedia(() => true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));
    expect(result.current).toBe(true);
    act(() => mm.set('(max-width: 767.98px)', false));
    expect(result.current).toBe(false);
  });
});

describe('semantic breakpoint hooks', () => {
  let mm: ReturnType<typeof installMatchMedia>;
  afterEach(() => mm?.restore());

  it('useIsMobile tracks the below-md query', () => {
    mm = installMatchMedia((q) => q === mediaDown('md'));
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
    expect(renderHook(() => useIsDesktop()).result.current).toBe(false);
  });

  it('useIsDesktop tracks the lg-and-up query', () => {
    mm = installMatchMedia((q) => q === mediaUp('lg'));
    expect(renderHook(() => useIsDesktop()).result.current).toBe(true);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });
});
