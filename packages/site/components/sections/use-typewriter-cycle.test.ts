import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTypewriterCycle, type TitlePair } from './use-typewriter-cycle';

const PAIRS: TitlePair[] = [
  { title: 'First title', subtitle: 'First subtitle' },
  { title: 'Second title', subtitle: 'Second subtitle' },
];

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

describe('useTypewriterCycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the first pair in full, no cycling, under reduced motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTypewriterCycle(PAIRS));
    expect(result.current).toEqual({
      index: 0,
      title: 'First title',
      subtitle: 'First subtitle',
      typing: false,
    });
  });

  it('starts on the first pair and types a prefix of its title', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTypewriterCycle(PAIRS, { titleSpeed: 10 }));
    expect(result.current.index).toBe(0);
    expect(result.current.typing).toBe(true);
    // displayed title is always a prefix of the real first title
    expect(PAIRS[0]!.title.startsWith(result.current.title)).toBe(true);
  });

  it('returns the initial empty state for an empty pair list', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTypewriterCycle([]));
    expect(result.current).toEqual({ index: 0, title: '', subtitle: '', typing: true });
  });
});
