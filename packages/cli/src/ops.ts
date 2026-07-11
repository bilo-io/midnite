import type { OpsSummary } from '@midnite/shared';

// Phase 61 I — pure render helpers for `midnite ops`. The command body fetches
// `/metrics/ops` and paints these rows; shaping lives here for testability.

/** Live gauge rows: signal + value ("—" when unset). */
export function opsGaugeRows(s: OpsSummary): string[][] {
  const g = s.gauges;
  const num = (n: number | null): string => (n === null ? '—' : n.toLocaleString('en-US'));
  return [
    ['Queue depth', num(g.queueDepth)],
    ['Slots in use', g.slotsUsed === null && g.slotsTotal === null ? '—' : `${num(g.slotsUsed)} / ${num(g.slotsTotal)}`],
    ['Last tick latency', g.lastTickLatencyMs === null ? '—' : `${g.lastTickLatencyMs.toFixed(0)} ms`],
    ['Gauges updated', g.updatedAt ? g.updatedAt.replace('T', ' ').slice(0, 19) : '—'],
  ];
}

/** Terminal-run outcome counts (done/abandoned/failed/cancelled) + total. */
export function opsOutcomeRows(s: OpsSummary): string[][] {
  const o = s.outcomeCounts;
  const total = o.done + o.abandoned + o.failed + o.cancelled;
  return [
    ['Done', String(o.done)],
    ['Abandoned', String(o.abandoned)],
    ['Failed', String(o.failed)],
    ['Cancelled', String(o.cancelled)],
    ['Total', String(total)],
  ];
}

/** Run-duration distribution buckets. */
export function opsDurationRows(s: OpsSummary): string[][] {
  const d = s.durationBuckets;
  return [
    ['< 1s', String(d.lt1s)],
    ['< 5s', String(d.lt5s)],
    ['< 30s', String(d.lt30s)],
    ['< 2m', String(d.lt2m)],
    ['≥ 2m', String(d.gte2m)],
  ];
}

/** The last `limit` days of throughput (most recent last), oldest trimmed. */
export function opsThroughputRows(s: OpsSummary, limit = 7): string[][] {
  return s.throughputByDay.slice(-limit).map((r) => [r.day, String(r.count)]);
}
