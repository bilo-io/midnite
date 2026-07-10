import type { RollupPeriod } from '@midnite/shared';

/**
 * Pure helpers for the Phase 61 E rollup job — bucketing + the deterministic
 * key. Kept side-effect-free so the aggregation math is unit-testable without a
 * DB or a clock.
 */

/** The deterministic upsert key: empty segment for a null dimension. */
export function rollupKey(r: {
  period: string;
  bucketStart: string;
  source: string;
  repo?: string | null;
  provider?: string | null;
  model?: string | null;
}): string {
  return [r.period, r.bucketStart, r.source, r.repo ?? '', r.provider ?? '', r.model ?? ''].join('|');
}

/**
 * Start of the bucket containing `nowIso` (UTC) — the **exclusive upper bound**
 * for closed buckets (rows at/after it are still accumulating, so aren't rolled).
 * Relies on ISO-8601 UTC strings (`YYYY-MM-DDTHH:...Z`), which every timestamp
 * column in this codebase uses.
 */
export function currentBucketStart(nowIso: string, period: RollupPeriod): string {
  return period === 'hourly'
    ? `${nowIso.slice(0, 13)}:00:00.000Z`
    : `${nowIso.slice(0, 10)}T00:00:00.000Z`;
}

/** ISO timestamp `days` before `nowIso`. */
export function isoDaysBefore(nowIso: string, days: number): string {
  return new Date(Date.parse(nowIso) - days * 86_400_000).toISOString();
}
