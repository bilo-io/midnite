import { describe, expect, it } from 'vitest';
import { seriesChange } from './market-change';

describe('seriesChange', () => {
  it('measures the move across the whole plotted window', () => {
    const change = seriesChange([
      { t: 1, c: 100 },
      { t: 2, c: 90 },
      { t: 3, c: 125 },
    ]);
    expect(change).toEqual({ first: 100, last: 125, change: 25, changePct: 25 });
  });

  it('reports a fall as a negative percentage', () => {
    expect(seriesChange([{ t: 1, c: 200 }, { t: 2, c: 150 }])?.changePct).toBe(-25);
  });

  it('describes the window it was given, not a fixed 24 hours', () => {
    // The same asset over two windows must yield two different numbers — the bug
    // was one 24h figure shown under every timeframe label.
    const week = seriesChange([{ t: 1, c: 100 }, { t: 2, c: 110 }]);
    const year = seriesChange([{ t: 1, c: 10 }, { t: 2, c: 110 }]);
    expect(week?.changePct).toBe(10);
    expect(year?.changePct).toBe(1000);
  });

  it('returns null when there is nothing to measure', () => {
    expect(seriesChange([])).toBeNull();
    expect(seriesChange(undefined)).toBeNull();
    expect(seriesChange([{ t: 1, c: 100 }])).toEqual({ first: 100, last: 100, change: 0, changePct: 0 });
    expect(seriesChange([{ t: 1, c: 0 }, { t: 2, c: 5 }])).toBeNull(); // no meaningful % from zero
  });
});
