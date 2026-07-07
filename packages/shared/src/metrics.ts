import { z } from 'zod';

/**
 * Ops metrics contract (Phase 22 A3).
 *
 * `MetricsGauges` — live signals from the in-memory GaugeStore (lost on restart).
 * `OpsSummary`    — windowed aggregates from agent_run_stats (persistent history).
 *
 * The web ops page calls `GET /metrics/ops` and receives both; LLM spend
 * is NOT re-aggregated here — the page also calls `GET /usage/summary`
 * (Decision §5).
 */

// ── Gauges (live, in-memory) ──────────────────────────────────────────────────

export const MetricsGaugesSchema = z.object({
  queueDepth: z.number().int().nonnegative().nullable(),
  slotsUsed: z.number().int().nonnegative().nullable(),
  slotsTotal: z.number().int().positive().nullable(),
  lastTickLatencyMs: z.number().nonnegative().nullable(),
  updatedAt: z.string().nullable(),
});
export type MetricsGauges = z.infer<typeof MetricsGaugesSchema>;

// ── Per-day throughput ────────────────────────────────────────────────────────

export const RunCountByDaySchema = z.object({
  day: z.string(),
  count: z.number().int().nonnegative(),
});
export type RunCountByDay = z.infer<typeof RunCountByDaySchema>;

// ── Duration distribution ─────────────────────────────────────────────────────

export const DurationBucketsSchema = z.object({
  lt1s: z.number().int().nonnegative(),
  lt5s: z.number().int().nonnegative(),
  lt30s: z.number().int().nonnegative(),
  lt2m: z.number().int().nonnegative(),
  gte2m: z.number().int().nonnegative(),
});
export type DurationBuckets = z.infer<typeof DurationBucketsSchema>;

// ── Outcome counts ────────────────────────────────────────────────────────────

export const OutcomeCountsSchema = z.object({
  done: z.number().int().nonnegative(),
  abandoned: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
});
export type OutcomeCounts = z.infer<typeof OutcomeCountsSchema>;

// ── Query + response ──────────────────────────────────────────────────────────

/** Query params for `GET /metrics/ops`. Both timestamps are ISO 8601. */
export const OpsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
export type OpsQuery = z.infer<typeof OpsQuerySchema>;

export const OpsSummarySchema = z.object({
  gauges: MetricsGaugesSchema,
  throughputByDay: z.array(RunCountByDaySchema),
  durationBuckets: DurationBucketsSchema,
  outcomeCounts: OutcomeCountsSchema,
});
export type OpsSummary = z.infer<typeof OpsSummarySchema>;

// ── Gauge history (Phase 61 D — persisted samples) ────────────────────────────

/**
 * One persisted sample of the live gauges (Phase 61 D). The sampler writes a row
 * every `metrics.sampleIntervalMs` so fleet-trend history survives a restart —
 * the in-memory {@link MetricsGaugesSchema} snapshot is lost on boot, this isn't.
 * Individual fields are nullable (a gauge may be unset when the sample is taken),
 * but a fully-null sample is never persisted.
 */
export const GaugeSampleSchema = z.object({
  at: z.string(),
  queueDepth: z.number().int().nonnegative().nullable(),
  slotsUsed: z.number().int().nonnegative().nullable(),
  slotsTotal: z.number().int().nonnegative().nullable(),
  tickLatencyMs: z.number().nonnegative().nullable(),
});
export type GaugeSample = z.infer<typeof GaugeSampleSchema>;

/** Query params for `GET /metrics/gauges/history`. Both timestamps are ISO 8601. */
export const GaugeHistoryQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
export type GaugeHistoryQuery = z.infer<typeof GaugeHistoryQuerySchema>;

/** Cap on points returned by the history endpoint; beyond it the response is
 *  flagged `truncated` (newest kept) rather than silently cut. Long windows get
 *  rollup-backed series in Theme E. */
export const GAUGE_HISTORY_MAX_POINTS = 2000;

export const GaugeHistoryResponseSchema = z.object({
  samples: z.array(GaugeSampleSchema),
  /** True when the window held more than {@link GAUGE_HISTORY_MAX_POINTS} samples. */
  truncated: z.boolean(),
});
export type GaugeHistoryResponse = z.infer<typeof GaugeHistoryResponseSchema>;
