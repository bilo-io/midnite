import { z } from 'zod';

// Phase 22 A3 — OpsSummary and MetricsGauges shapes for GET /metrics/ops.
// The gateway composes the GaugeStore (in-memory) + MetricsRepository (per-run DB)
// to serve one response; the web /ops page reads it alongside GET /usage/summary.

/** Live in-memory gauge snapshot (lost on restart). */
export const MetricsGaugesSchema = z.object({
  /** How many `todo` tasks were ready to run at the last scheduler tick. */
  queueDepth: z.number().int().nonnegative().nullable(),
  /** Live slot utilization: used agent slots / total pool capacity. */
  slots: z
    .object({ used: z.number().int().nonnegative(), total: z.number().int().positive() })
    .nullable(),
  /** Wall-clock time the last scheduler tick took (ms). */
  lastTickLatencyMs: z.number().nonnegative().nullable(),
  /** ISO timestamp of the most-recent gauge update. */
  updatedAt: z.string().nullable(),
});
export type MetricsGauges = z.infer<typeof MetricsGaugesSchema>;

/** Runs-per-day entry in the throughput series. */
export const RunCountByDaySchema = z.object({
  day: z.string(),
  count: z.number().int().nonnegative(),
});
export type RunCountByDay = z.infer<typeof RunCountByDaySchema>;

/** 5-bucket run-duration histogram (ms). */
export const DurationBucketsSchema = z.object({
  under30s: z.number().int().nonnegative(),
  under2m: z.number().int().nonnegative(),
  under10m: z.number().int().nonnegative(),
  under30m: z.number().int().nonnegative(),
  over30m: z.number().int().nonnegative(),
});
export type DurationBuckets = z.infer<typeof DurationBucketsSchema>;

export const OPS_OUTCOMES = ['done', 'abandoned', 'failed', 'cancelled'] as const;
export type RunOutcome = (typeof OPS_OUTCOMES)[number];
export const OutcomeCountsSchema = z.record(
  z.enum(OPS_OUTCOMES),
  z.number().int().nonnegative(),
);
export type OutcomeCounts = z.infer<typeof OutcomeCountsSchema>;

/** Full ops summary returned by `GET /metrics/ops`. */
export const OpsSummarySchema = z.object({
  /** Live gauges (in-memory, lost on restart). */
  gauges: MetricsGaugesSchema,
  /** Daily run throughput over the query window. */
  throughput: z.array(RunCountByDaySchema),
  /** Duration histogram across all runs in the window. */
  durations: DurationBucketsSchema,
  /** Terminal outcome counts. */
  outcomes: OutcomeCountsSchema,
  /** ISO query window — from/to used to compute the stats. */
  window: z.object({ from: z.string(), to: z.string() }),
});
export type OpsSummary = z.infer<typeof OpsSummarySchema>;

export const OpsQuerySchema = z.object({
  /** ISO date string (inclusive, default 30 days ago). */
  from: z.string().optional(),
  /** ISO date string (inclusive, default now). */
  to: z.string().optional(),
});
export type OpsQuery = z.infer<typeof OpsQuerySchema>;

export const OpsSummaryResponseSchema = z.object({ ops: OpsSummarySchema });
export type OpsSummaryResponse = z.infer<typeof OpsSummaryResponseSchema>;
