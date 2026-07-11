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

/**
 * The raw LLM output for a retro narrative (Phase 62 C) — before `generatedBy` is
 * stamped on. Kept separate from {@link RetroNarrativeSchema} so the gateway can
 * validate a structured completion without importing zod directly.
 */
export const RetroNarrativeDraftSchema = z.object({
  whatHappened: z.string(),
  whatTrippedIt: z.string().nullish(),
  notable: z.array(z.string()).default([]),
});
export type RetroNarrativeDraft = z.infer<typeof RetroNarrativeDraftSchema>;

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
 * Whether a task retro is **notable** — worth surfacing to a human rather than
 * filing silently. Deterministic (no LLM), so the retro pipeline (Phase 62 D)
 * can branch its notify step on it. True when the task was **abandoned**, a
 * **retry budget or quality gate gave out** (`retries-exhausted` / `gate-failed`
 * failure), or a **check run failed** — i.e. the outcome someone should look at
 * even though the task ended cleanly. A `done` task with none of these is routine
 * and stays quiet.
 */
export function isRetroNotable(
  retro: Pick<TaskRetro, 'outcome' | 'failures' | 'checks'>,
): boolean {
  if (retro.outcome === 'abandoned') return true;
  if (retro.failures.some((f) => f.class === 'retries-exhausted' || f.class === 'gate-failed')) {
    return true;
  }
  if (retro.checks && retro.checks.failed > 0) return true;
  return false;
}

/**
 * Phase 62 Theme C — a periodic fleet **digest**: the reporting roll-up of what
 * shipped / failed / needs attention over a window. Assembled deterministically
 * by the gateway's `DigestBuilder` from terminal tasks + their retros, with
 * best-effort spend + cycle-time folded in (each degrades to null when its
 * source is unreachable) and ONE LLM-generated `headline` (fail-soft to a
 * deterministic string). Persisted as a `digests` row (structured JSON + the
 * rendered markdown).
 */

/** Terminal-outcome tallies over the window. */
export const DigestCountsSchema = z.object({
  /** Tasks that reached `done`. */
  shipped: z.number().int().nonnegative(),
  /** Tasks that reached `abandoned`. */
  failed: z.number().int().nonnegative(),
  /** Failed tasks whose retro flagged something notable (a human should look). */
  needsAttention: z.number().int().nonnegative(),
});
export type DigestCounts = z.infer<typeof DigestCountsSchema>;

/** One section of the digest — a per-repo (or per-project) breakdown. */
export const DigestSectionSchema = z.object({
  /** The repo name or project id this section rolls up. */
  name: z.string(),
  shipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});
export type DigestSection = z.infer<typeof DigestSectionSchema>;

/** A called-out task in the digest, sourced from a notable retro. */
export const DigestHighlightSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  outcome: RetroOutcomeSchema,
  /** A short human note (from the retro's narrative/notable, or deterministic). */
  note: z.string(),
});
export type DigestHighlight = z.infer<typeof DigestHighlightSchema>;

/** Best-effort spend over the window (agent-session attribution). Null when the
 *  usage source was unreachable — the digest degrades silently. */
export const DigestSpendSchema = z.object({
  totalUsd: z.number().nonnegative(),
  measuredUsd: z.number().nonnegative(),
  sessions: z.number().int().nonnegative(),
});
export type DigestSpend = z.infer<typeof DigestSpendSchema>;

/** Best-effort cycle-time over the window (end-to-end, ms). Null when the metrics
 *  source was unreachable. Percentiles, not a mean — mirrors the metrics service. */
export const DigestCycleSchema = z.object({
  tasks: z.number().int().nonnegative(),
  p50Ms: z.number().int().nonnegative().nullable(),
  p90Ms: z.number().int().nonnegative().nullable(),
});
export type DigestCycle = z.infer<typeof DigestCycleSchema>;

export const DigestSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  /** Window start (inclusive ISO). */
  from: z.string(),
  /** Window end (inclusive ISO). */
  to: z.string(),
  counts: DigestCountsSchema,
  sections: z.array(DigestSectionSchema),
  highlights: z.array(DigestHighlightSchema),
  /** Best-effort spend; null when unreachable. */
  spend: DigestSpendSchema.nullable().optional(),
  /** Best-effort cycle-time; null when unreachable. */
  cycle: DigestCycleSchema.nullable().optional(),
  /** One-line summary — LLM-generated, or a deterministic fallback. */
  headline: z.string(),
  /** Fully-rendered markdown body. */
  markdown: z.string(),
});
export type Digest = z.infer<typeof DigestSchema>;

/** The raw LLM output for a digest headline (Phase 62 C) — lets the gateway
 *  validate a structured completion without importing zod directly. */
export const DigestHeadlineDraftSchema = z.object({ headline: z.string() });
export type DigestHeadlineDraft = z.infer<typeof DigestHeadlineDraftSchema>;

/**
 * Phase 62 G — a lightweight digest feed row. The list surface renders date,
 * window, headline + counts without shipping the heavy `sections`/`highlights`/
 * `markdown` of every digest; the full {@link Digest} is fetched on selection.
 */
export const DigestListItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  from: z.string(),
  to: z.string(),
  headline: z.string(),
  counts: DigestCountsSchema,
});
export type DigestListItem = z.infer<typeof DigestListItemSchema>;

/** Response for `GET /digests` — recent digests, most-recent-first. */
export const DigestListResponseSchema = z.object({
  digests: z.array(DigestListItemSchema),
});
export type DigestListResponse = z.infer<typeof DigestListResponseSchema>;

/** Response for `GET /digests/:id` — a single full digest. */
export const DigestResponseSchema = z.object({ digest: DigestSchema });
export type DigestResponse = z.infer<typeof DigestResponseSchema>;
