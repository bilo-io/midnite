import type { CpuInfo } from 'node:os';

// Pure CPU-utilization helpers. `os.cpus()` reports *cumulative* per-core time
// counters, so an instantaneous usage figure only exists as a delta between two
// samples — these helpers make that delta computable (and unit-testable) without
// touching `os` directly.

export type CpuTimes = { idle: number; total: number };

/** Sum idle + total (busy + idle) CPU time across all logical cores. */
export function aggregateCpuTimes(cpus: readonly CpuInfo[]): CpuTimes {
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

/**
 * Aggregate CPU utilization (0–100) over the window between two samples.
 * Returns 0 when the total-time delta is non-positive (first sample, or a clock
 * that didn't advance) so the figure can never go negative or divide by zero.
 */
export function cpuUsagePct(prev: CpuTimes, cur: CpuTimes): number {
  const idleDelta = cur.idle - prev.idle;
  const totalDelta = cur.total - prev.total;
  if (totalDelta <= 0) return 0;
  const usage = (1 - idleDelta / totalDelta) * 100;
  return Math.min(100, Math.max(0, usage));
}
