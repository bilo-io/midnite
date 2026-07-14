import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useSeenGuides } from './use-seen-guides';
import { SETTINGS_STORAGE_KEY } from '@/lib/app-settings';
import type { Guide } from './steps';

const guide = (id: string, version: number): Guide => ({
  id,
  version,
  label: `${id} tour`,
  steps: [{ anchor: 'x', title: 't', body: 'b' }],
});

/** Seed the settings localStorage blob the hook reads through. */
function seed(seenGuides: unknown) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ seenGuides }));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe('useSeenGuides', () => {
  it('treats a guide as unseen until marked, then seen at that version', () => {
    const { result } = renderHook(() => useSeenGuides());
    const g = guide('board', 1);

    expect(result.current.hasSeen(g)).toBe(false);
    act(() => result.current.markSeen(g));
    expect(result.current.hasSeen(g)).toBe(true);
  });

  it('re-surfaces a guide whose version was bumped above the stored version', () => {
    seed({ board: 1 });
    const { result } = renderHook(() => useSeenGuides());

    // Stored v1 satisfies a v1 guide, but not a bumped v2.
    expect(result.current.hasSeen(guide('board', 1))).toBe(true);
    expect(result.current.hasSeen(guide('board', 2))).toBe(false);
  });

  it('markSeen records the guide’s current version (so a later bump re-surfaces it)', () => {
    const { result } = renderHook(() => useSeenGuides());
    act(() => result.current.markSeen(guide('memory', 3)));

    expect(result.current.seen.memory).toBe(3);
    expect(result.current.hasSeen(guide('memory', 3))).toBe(true);
    expect(result.current.hasSeen(guide('memory', 4))).toBe(false);
  });

  it('hydrates a legacy string[] blob as version-1 seen (coercion regression)', () => {
    seed(['board', 'memory']);
    const { result } = renderHook(() => useSeenGuides());

    expect(result.current.hasSeen(guide('board', 1))).toBe(true);
    expect(result.current.hasSeen(guide('memory', 1))).toBe(true);
    // A bumped version is still unseen against a coerced v1.
    expect(result.current.hasSeen(guide('board', 2))).toBe(false);
  });

  it('hasAnyUnseen reflects whether any shipped guide is unseen', () => {
    // Nothing seen → the shipped guides are all unseen.
    const { result } = renderHook(() => useSeenGuides());
    expect(result.current.hasAnyUnseen).toBe(true);
  });
});
