import { describe, expect, it } from 'vitest';

import { deriveCycle, percentileNearestRank, statOf } from './cycle-time';

describe('percentileNearestRank', () => {
  it('returns null for an empty array', () => {
    expect(percentileNearestRank([], 50)).toBeNull();
  });

  it('picks an observed value (no interpolation)', () => {
    const sorted = [10, 20, 30, 40, 50];
    // p50 → ceil(0.5*5)=3 → index 2 → 30
    expect(percentileNearestRank(sorted, 50)).toBe(30);
    // p90 → ceil(0.9*5)=5 → index 4 → 50
    expect(percentileNearestRank(sorted, 90)).toBe(50);
  });

  it('handles a single value', () => {
    expect(percentileNearestRank([42], 50)).toBe(42);
    expect(percentileNearestRank([42], 90)).toBe(42);
  });

  it('clamps p0 to the first element', () => {
    expect(percentileNearestRank([5, 6, 7], 0)).toBe(5);
  });
});

describe('deriveCycle', () => {
  const created = '2026-06-10T00:00:00.000Z';

  it('computes wait / work / end-to-end from the three timestamps', () => {
    const c = deriveCycle(created, '2026-06-10T01:00:00.000Z', '2026-06-10T03:00:00.000Z');
    expect(c.waitMs).toBe(3_600_000); // 1h
    expect(c.workMs).toBe(7_200_000); // 2h
    expect(c.endToEndMs).toBe(10_800_000); // 3h
  });

  it('yields null wait/work when the task never entered wip', () => {
    const c = deriveCycle(created, null, '2026-06-10T02:00:00.000Z');
    expect(c.waitMs).toBeNull();
    expect(c.workMs).toBeNull();
    expect(c.endToEndMs).toBe(7_200_000);
  });

  it('clamps a negative duration (clock skew) to 0', () => {
    // done before created — shouldn't produce a negative number.
    const c = deriveCycle('2026-06-10T05:00:00.000Z', null, '2026-06-10T04:00:00.000Z');
    expect(c.endToEndMs).toBe(0);
  });
});

describe('statOf', () => {
  it('sorts, then reports p50/p90 + count', () => {
    expect(statOf([30, 10, 50, 20, 40])).toEqual({ p50Ms: 30, p90Ms: 50, count: 5 });
  });

  it('is null/0 for an empty segment', () => {
    expect(statOf([])).toEqual({ p50Ms: null, p90Ms: null, count: 0 });
  });
});
