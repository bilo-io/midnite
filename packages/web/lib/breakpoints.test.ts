import { describe, expect, it } from 'vitest';
import { BREAKPOINTS, mediaBetween, mediaDown, mediaUp } from './breakpoints';

describe('breakpoints', () => {
  it('keeps the px values aligned with Tailwind defaults and in ascending order', () => {
    expect(BREAKPOINTS).toEqual({ sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 });
    const values = Object.values(BREAKPOINTS);
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });

  it('mediaUp matches at the breakpoint and wider', () => {
    expect(mediaUp('lg')).toBe('(min-width: 1024px)');
  });

  it('mediaDown matches strictly below the breakpoint (fractional offset)', () => {
    expect(mediaDown('md')).toBe('(max-width: 767.98px)');
  });

  it('mediaUp and mediaDown of the same breakpoint do not both match at the cutoff', () => {
    // mediaUp('md') matches >= 768; mediaDown('md') matches <= 767.98 — no overlap.
    expect(mediaUp('md')).toBe('(min-width: 768px)');
    expect(mediaDown('md')).toBe('(max-width: 767.98px)');
  });

  it('mediaBetween composes a half-open [min, max) range', () => {
    expect(mediaBetween('md', 'lg')).toBe('(min-width: 768px) and (max-width: 1023.98px)');
  });
});
