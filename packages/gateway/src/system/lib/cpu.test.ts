import type { CpuInfo } from 'node:os';

import { describe, expect, it } from 'vitest';

import { aggregateCpuTimes, cpuUsagePct } from './cpu';

const core = (user: number, sys: number, idle: number): CpuInfo => ({
  model: 'test',
  speed: 1,
  times: { user, nice: 0, sys, idle, irq: 0 },
});

describe('aggregateCpuTimes', () => {
  it('sums idle and total (busy + idle) across cores', () => {
    const agg = aggregateCpuTimes([core(10, 5, 85), core(20, 10, 70)]);
    expect(agg.idle).toBe(85 + 70);
    expect(agg.total).toBe(10 + 5 + 85 + (20 + 10 + 70));
  });
});

describe('cpuUsagePct', () => {
  it('is 100% busy when no idle time elapses between samples', () => {
    const prev = { idle: 100, total: 200 };
    const cur = { idle: 100, total: 300 }; // +100 total, +0 idle
    expect(cpuUsagePct(prev, cur)).toBe(100);
  });

  it('is 0% when all elapsed time was idle', () => {
    const prev = { idle: 100, total: 200 };
    const cur = { idle: 200, total: 300 }; // +100 total, +100 idle
    expect(cpuUsagePct(prev, cur)).toBe(0);
  });

  it('is 50% for a half-idle window', () => {
    const prev = { idle: 0, total: 0 };
    const cur = { idle: 50, total: 100 };
    expect(cpuUsagePct(prev, cur)).toBe(50);
  });

  it('returns 0 (never negative / NaN) when the clock did not advance', () => {
    const same = { idle: 100, total: 200 };
    expect(cpuUsagePct(same, same)).toBe(0);
  });

  it('clamps to 0–100 even if counters go backwards', () => {
    const prev = { idle: 0, total: 0 };
    const cur = { idle: 500, total: 100 }; // idle delta > total delta
    const pct = cpuUsagePct(prev, cur);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });
});
