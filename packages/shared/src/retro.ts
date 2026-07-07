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
 * Phase 62 Theme D — a periodic fleet **digest**. Stub only in Theme A so the
 * storage + surfaces can reference the type; Theme D fills the real shape.
 */
export const DigestSchema = z
  .object({
    id: z.string(),
    createdAt: z.string(),
  })
  .passthrough();
export type Digest = z.infer<typeof DigestSchema>;
