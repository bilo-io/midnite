import type { CycleTimeStat } from '@midnite/shared';

/**
 * Pure cycle-time helpers (Phase 61 C). Segment derivation + nearest-rank
 * percentiles — no I/O, no DB, so they're unit-testable in isolation. The service
 * pulls the raw per-task timestamps from the repository and feeds them here.
 */

/** The three lifecycle segments for a single completed task, in milliseconds. */
export interface TaskCycle {
  /** createdAt → first entry into `wip`; null when the task never entered `wip`. */
  waitMs: number | null;
  /** first `wip` → final `done`; null when the task never entered `wip`. */
  workMs: number | null;
  /** createdAt → final `done`; always present for a completed task. */
  endToEndMs: number;
}

/**
 * Nearest-rank percentile of an already-sorted (ascending) array — no
 * interpolation, so the result is always an observed value. Returns null for an
 * empty input. `p` is 0–100.
 */
export function percentileNearestRank(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const rank = Math.ceil((p / 100) * sortedAsc.length);
  const idx = Math.min(Math.max(rank, 1), sortedAsc.length) - 1;
  return sortedAsc[idx];
}

/**
 * Derive a task's segments from its createdAt, first `wip` entry, and final
 * `done`. Clamped at 0 so a clock skew (event `at` before `createdAt`) can't
 * yield a negative duration.
 */
export function deriveCycle(
  createdAt: string,
  firstWipAt: string | null,
  doneAt: string,
): TaskCycle {
  const created = Date.parse(createdAt);
  const done = Date.parse(doneAt);
  const wip = firstWipAt ? Date.parse(firstWipAt) : null;
  return {
    endToEndMs: Math.max(0, done - created),
    waitMs: wip !== null ? Math.max(0, wip - created) : null,
    workMs: wip !== null ? Math.max(0, done - wip) : null,
  };
}

/** p50/p90 (nearest-rank) + contributing count for one segment's values. */
export function statOf(values: number[]): CycleTimeStat {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50Ms: percentileNearestRank(sorted, 50),
    p90Ms: percentileNearestRank(sorted, 90),
    count: sorted.length,
  };
}
