import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import {
  AUTH_INTRO_SEEN_KEY,
  introAtLeast,
  useAuthIntro,
} from './use-auth-intro';

/** Point-in-time matchMedia stub: `desktop` controls the `lg` min-width query. */
function stubMatchMedia(desktop: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: desktop && query.includes('min-width'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
  window.sessionStorage.clear();
});

describe('introAtLeast', () => {
  it('orders stages cumulatively', () => {
    expect(introAtLeast('done', 'logo')).toBe(true);
    expect(introAtLeast('logo', 'done')).toBe(false);
    expect(introAtLeast('move', 'move')).toBe(true);
  });
});

describe('useAuthIntro', () => {
  it('walks the timeline on a fresh desktop visit and marks it seen', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useAuthIntro(true));
    expect(result.current).toBe('hidden');

    act(() => vi.advanceTimersByTime(40)); // decision tick + starfield@0
    expect(result.current).toBe('starfield');

    act(() => vi.advanceTimersByTime(1500)); // logo@500, cursor@1500
    expect(result.current).toBe('cursor');

    act(() => vi.advanceTimersByTime(3500)); // …through done@5000
    expect(result.current).toBe('done');

    expect(window.sessionStorage.getItem(AUTH_INTRO_SEEN_KEY)).toBe('1');
  });

  it('skips straight to done when already seen this session', () => {
    stubMatchMedia(true);
    window.sessionStorage.setItem(AUTH_INTRO_SEEN_KEY, '1');
    const { result } = renderHook(() => useAuthIntro(true));
    act(() => vi.advanceTimersByTime(40));
    expect(result.current).toBe('done');
  });

  it('skips below desktop (no hero to choreograph)', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useAuthIntro(true));
    act(() => vi.advanceTimersByTime(40));
    expect(result.current).toBe('done');
    // A skipped intro is not "seen" — a later desktop visit may still play it.
    expect(window.sessionStorage.getItem(AUTH_INTRO_SEEN_KEY)).toBeNull();
  });

  it('skips under reduced motion', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useAuthIntro(false));
    act(() => vi.advanceTimersByTime(40));
    expect(result.current).toBe('done');
  });
});
