import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTypewriter } from './use-typewriter';

// Minimal matchMedia stub so `prefersReducedMotion()` is controllable in jsdom
// (which doesn't implement matchMedia).
function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('types the string out progressively and reports done', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTypewriter({ text: 'abcdef', speed: 20 }));

    expect(result.current.displayed).toBe('');
    expect(result.current.done).toBe(false);

    act(() => {
      vi.advanceTimersByTime(20);
    });
    const partial = result.current.displayed;
    expect(partial.length).toBeGreaterThan(0);
    expect(partial.length).toBeLessThan('abcdef'.length);
    expect(result.current.done).toBe(false);

    act(() => {
      vi.advanceTimersByTime(20 * 6);
    });
    expect(result.current.displayed).toBe('abcdef');
    expect(result.current.done).toBe(true);
  });

  it('stays empty until start flips true', () => {
    mockMatchMedia(false);
    const { result, rerender } = renderHook(
      ({ start }: { start: boolean }) => useTypewriter({ text: 'go', start, speed: 20 }),
      { initialProps: { start: false } },
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.displayed).toBe('');

    rerender({ start: true });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.displayed).toBe('go');
    expect(result.current.done).toBe(true);
  });

  it('renders the full string immediately under reduced motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTypewriter({ text: 'hello', speed: 20 }));

    expect(result.current.displayed).toBe('hello');
    expect(result.current.done).toBe(true);
  });
});
