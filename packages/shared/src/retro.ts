import { z } from 'zod';

import { CheckRunStatusSchema } from './checks.js';
import { TaskFailureSchema } from './task-failure.js';

/**
 * Phase 62 — Fable-Digest. A **task retrospective**: the factual story of what an
 * agent did on a task, assembled **deterministically** (zero LLM) from the data
 * already persisted — `task_events`, `agent_run_stats`, `task_failures`,
 * `ai_review`, check runs, PR — on the task's terminal transition. Theme A builds
 * this skeleton; the `narrative` (an LLM summary) is layered on in a later theme,
 * hence nullable here.
 */

/** The terminal outcome a retro was built for. */
export const RetroOutcomeSchema = z.enum(['done', 'abandoned']);
export type RetroOutcome = z.infer<typeof RetroOutcomeSchema>;

/** One entry in the task's timeline — mirrors a `task_events` row. */
export const RetroEventSchema = z.object({
  at: z.string(),
  kind: z.string(),
  /** Optional human detail parsed from the event's `data` payload. */
  detail: z.string().optional(),
});
export type RetroEvent = z.infer<typeof RetroEventSchema>;

/** One agent run attempt — mirrors an `agent_run_stats` row. */
export const RetroAttemptSchema = z.object({
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  /** `done` | `abandoned` | `failed` | `cancelled`; null if it never resolved. */
  outcome: z.string().nullable(),
  /** The task's `retryCount` at this attempt (0 = first try). */
  retryIndex: z.number().int().nonnegative(),
});
export type RetroAttempt = z.infer<typeof RetroAttemptSchema>;

/** AI code-review outcome carried onto the retro (Phase 37), when present. */
export const RetroReviewSchema = z.object({
  verdict: z.enum(['approved', 'commented', 'changes-requested']),
  summary: z.string(),
});
export type RetroReview = z.infer<typeof RetroReviewSchema>;

/** Quality-gate check summary (Phase 30), when the task ran checks. */
export const RetroChecksSchema = z.object({
  status: CheckRunStatusSchema,
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});
export type RetroChecks = z.infer<typeof RetroChecksSchema>;

/** Elapsed-time breakdown. Any leg is null when its boundary events are missing. */
export const RetroDurationsSchema = z.object({
  /** todo → first wip (queued/waiting time). */
  waitMs: z.number().int().nonnegative().nullable(),
  /** first wip → terminal (active work time). */
  workMs: z.number().int().nonnegative().nullable(),
  /** created → terminal (wall clock). */
  totalMs: z.number().int().nonnegative().nullable(),
});
export type RetroDurations = z.infer<typeof RetroDurationsSchema>;

/**
 * The LLM narrative layered on later (Theme C/H). Null in the deterministic
 * skeleton. `generatedBy` records provenance (always `'llm'` when present).
 */
export const RetroNarrativeSchema = z.object({
  whatHappened: z.string(),
  whatTrippedIt: z.string().nullable(),
  notable: z.array(z.string()),
  generatedBy: z.literal('llm'),
});
export type RetroNarrative = z.infer<typeof RetroNarrativeSchema>;

/** A task's retrospective — the full stored shape. */
export const TaskRetroSchema = z.object({
  taskId: z.string(),
  outcome: RetroOutcomeSchema,
  timeline: z.array(RetroEventSchema),
  attempts: z.array(RetroAttemptSchema),
  failures: z.array(TaskFailureSchema),
  checks: RetroChecksSchema.optional(),
  review: RetroReviewSchema.optional(),
  prUrl: z.string().optional(),
  durations: RetroDurationsSchema,
  /** LLM narrative (Theme C/H); null in the deterministic skeleton. */
  narrative: RetroNarrativeSchema.nullable(),
  createdAt: z.string(),
});
export type TaskRetro = z.infer<typeof TaskRetroSchema>;

/** `GET /tasks/:id/retro` response. 404 when no retro has been built yet. */
export const RetroResponseSchema = z.object({ retro: TaskRetroSchema });
export type RetroResponse = z.infer<typeof RetroResponseSchema>;

/**
 * Phase 62 Theme C — a periodic fleet **digest**: the "what did the fleet do?"
 * artifact. Assembled **deterministically** (counts, per-repo/project sections,
 * retro highlights) by the `DigestBuilder` service, with **one** optional LLM
 * headline paragraph layered on top (`headline`/`generatedBy`, fail-soft to null).
 * Spend / cycle stats are folded in best-effort when the Phase 61 data exists.
 * Stored first-class (product data, never pruned by P61 retention) and rendered to
 * markdown for delivery.
 */

/** The reporting window a digest covers (ISO timestamps). */
export const DigestWindowSchema = z.object({
  from: z.string(),
  to: z.string(),
});
export type DigestWindow = z.infer<typeof DigestWindowSchema>;

/** Terminal-outcome tallies for the window (or one section of it). */
export const DigestCountsSchema = z.object({
  shipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  needsAttention: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type DigestCounts = z.infer<typeof DigestCountsSchema>;

/** A per-repo or per-project slice of the digest. */
export const DigestSectionSchema = z.object({
  /** `repo` name, `projectId`, or the literal `'unassigned'`. */
  key: z.string(),
  /** Human label (repo name / project name / "Unassigned"). */
  label: z.string(),
  /** How this section was grouped — mirrors the digest's `groupBy`. */
  grouping: z.enum(['repo', 'project']),
  counts: DigestCountsSchema,
  /** Task ids in this section (for deep-linking). */
  taskIds: z.array(z.string()),
});
export type DigestSection = z.infer<typeof DigestSectionSchema>;

/** A notable task surfaced in the digest — failures + retro narrative highlights. */
export const DigestHighlightSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  outcome: RetroOutcomeSchema,
  /** Why it's notable (abandoned, retries-exhausted, gate-failed) or a retro note. */
  note: z.string().nullable(),
  prUrl: z.string().optional(),
});
export type DigestHighlight = z.infer<typeof DigestHighlightSchema>;

/** Best-effort spend attribution for the window (P61 Theme B), null when absent. */
export const DigestSpendSchema = z.object({
  totalUsd: z.number().nonnegative().nullable(),
  measuredUsd: z.number().nonnegative(),
  estimatedUsd: z.number().nonnegative(),
  /** Sessions whose model was unpriced (tokens known, cost unknown). */
  unpricedSessions: z.number().int().nonnegative(),
});
export type DigestSpend = z.infer<typeof DigestSpendSchema>;

/** Best-effort cycle-time stats for the window (P61 Theme C), null when absent. */
export const DigestCycleSchema = z.object({
  p50WorkMs: z.number().int().nonnegative().nullable(),
  p90WorkMs: z.number().int().nonnegative().nullable(),
});
export type DigestCycle = z.infer<typeof DigestCycleSchema>;

/** The LLM headline paragraph; null when generated deterministically only. */
export const DigestHeadlineSchema = z.object({
  headline: z.string(),
  generatedBy: z.literal('llm'),
});
export type DigestHeadline = z.infer<typeof DigestHeadlineSchema>;

/** A stored fleet digest — the full shape. */
export const DigestSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  window: DigestWindowSchema,
  /** How sections are grouped. */
  groupBy: z.enum(['repo', 'project']),
  counts: DigestCountsSchema,
  sections: z.array(DigestSectionSchema),
  highlights: z.array(DigestHighlightSchema),
  /** Best-effort P61 spend/cycle; null when the data isn't available. */
  spend: DigestSpendSchema.nullable(),
  cycle: DigestCycleSchema.nullable(),
  /** LLM headline; null in the deterministic-only digest (fail-soft). */
  headline: DigestHeadlineSchema.nullable(),
  /** Rendered markdown body (deterministic; includes the headline when present). */
  markdown: z.string(),
});
export type Digest = z.infer<typeof DigestSchema>;

/** `GET /digests/:id` response. */
export const DigestResponseSchema = z.object({ digest: DigestSchema });
export type DigestResponse = z.infer<typeof DigestResponseSchema>;
