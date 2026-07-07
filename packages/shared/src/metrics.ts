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

// ── Cycle time (Phase 61 C — lifecycle time as a first-class metric) ──────────

/**
 * Cycle-time is derived from the `status.changed` task-event stream (no new
 * columns — Phase 61 C measures first). Per completed task we take three segments:
 *   • `wait`      = createdAt → **first** entry into `wip`  (time before pickup)
 *   • `work`      = first `wip` → **final** `done`          (working time; folds in retry/waiting detours)
 *   • `endToEnd`  = createdAt → final `done`                (total lead time)
 * Aggregated as p50/p90 (nearest-rank) over the completed tasks in the window,
 * optionally grouped by repo / project / priority.
 */

/** How work is grouped for the cycle-time aggregates. `none` = fleet-wide. */
export const CycleTimeGroupBySchema = z.enum(['none', 'repo', 'project', 'priority']);
export type CycleTimeGroupBy = z.infer<typeof CycleTimeGroupBySchema>;

/** Default trailing window for `GET /metrics/cycle-time` when none is supplied. */
export const CYCLE_TIME_DEFAULT_WINDOW_DAYS = 30;

/** Query params for `GET /metrics/cycle-time`. */
export const CycleTimeQuerySchema = z.object({
  groupBy: CycleTimeGroupBySchema.default('none'),
  /** Trailing window in days; a task counts when its final `done` falls inside it. */
  windowDays: z.coerce.number().int().positive().max(365).default(CYCLE_TIME_DEFAULT_WINDOW_DAYS),
});
export type CycleTimeQuery = z.infer<typeof CycleTimeQuerySchema>;

/**
 * p50/p90 for one segment across the tasks in a group, in milliseconds
 * (nearest-rank — no interpolation). `p50Ms`/`p90Ms` are null when no task in the
 * group had a measurable value for the segment (e.g. a task that never entered
 * `wip` contributes no `wait`/`work`). `count` is how many tasks contributed.
 */
export const CycleTimeStatSchema = z.object({
  p50Ms: z.number().nonnegative().nullable(),
  p90Ms: z.number().nonnegative().nullable(),
  count: z.number().int().nonnegative(),
});
export type CycleTimeStat = z.infer<typeof CycleTimeStatSchema>;

export const CycleTimeGroupSchema = z.object({
  /** Group value: repo name, project id, priority (`0`–`3` as a string), or `all` for `none`. */
  key: z.string(),
  /** Completed tasks in this group within the window. */
  taskCount: z.number().int().nonnegative(),
  /** todo → first `wip`: time a task waited before pickup. */
  wait: CycleTimeStatSchema,
  /** first `wip` → final `done`: working time (includes retry/waiting detours). */
  work: CycleTimeStatSchema,
  /** createdAt → final `done`: end-to-end lead time. */
  endToEnd: CycleTimeStatSchema,
  /** Summed duration of retry attempts (`agent_run_stats`, `retryCount > 0`) across the group. */
  retryOverheadMsTotal: z.number().nonnegative(),
  /** How many tasks in the group incurred at least one retry attempt. */
  tasksWithRetries: z.number().int().nonnegative(),
});
export type CycleTimeGroup = z.infer<typeof CycleTimeGroupSchema>;

export const CycleTimeResponseSchema = z.object({
  /** ISO start of the window (inclusive). */
  from: z.string(),
  /** ISO end of the window (inclusive). */
  to: z.string(),
  groupBy: CycleTimeGroupBySchema,
  /** One entry per group, descending by `taskCount` (single `all` entry for `none`). */
  groups: z.array(CycleTimeGroupSchema),
});
export type CycleTimeResponse = z.infer<typeof CycleTimeResponseSchema>;
