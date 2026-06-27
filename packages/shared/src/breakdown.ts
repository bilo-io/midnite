import { z } from 'zod';

import { TaskKindSchema, TaskSchema } from './task.js';

/**
 * One task in a structured breakdown. `ref` is a **local key** (e.g. `"build-api"`)
 * used to express sibling dependencies before real task ids exist — the gateway
 * resolves refs → ids at creation time (Theme B). `dependsOn` lists other `ref`s in
 * the same breakdown; self-references and unknown refs are pruned, not fatal.
 *
 * Conservative inference (Decision §3): `dependsOn` should only contain clear
 * blockers; independent work is left parallel.
 */
export const BreakdownTaskSchema = z.object({
  ref: z.string().min(1),
  title: z.string().min(1),
  kind: TaskKindSchema.optional(),
  /** 0 Low · 1 Normal · 2 High · 3 Urgent — mirrors task.priority. */
  priority: z.number().int().min(0).max(3).optional(),
  /** Local refs of tasks that must complete before this one can start. */
  dependsOn: z.array(z.string()).default([]),
  /**
   * Stable slug of the source line this task came from (Phase 42 Theme D phase-doc
   * seeding). Carried so the seeder can tag the task `phase-item:<anchor>` and
   * Theme E can match it back to the `.md` checkbox. Absent for non-doc breakdowns.
   */
  anchor: z.string().optional(),
});
export type BreakdownTask = z.infer<typeof BreakdownTaskSchema>;

/** A structured, dependency-aware task breakdown returned by the plan model. */
export const BreakdownSchema = z.object({
  tasks: z.array(BreakdownTaskSchema),
});
export type Breakdown = z.infer<typeof BreakdownSchema>;

/**
 * Request body for `POST /tasks/breakdown` (standalone goal → task breakdown).
 * `projectId` / `repo` are optional batch defaults applied to each created task.
 */
export const BreakdownGoalRequestSchema = z.object({
  goal: z.string().min(1),
  projectId: z.string().optional(),
  repo: z.string().optional(),
});
export type BreakdownGoalRequest = z.infer<typeof BreakdownGoalRequestSchema>;

/**
 * Response shape for the breakdown preview step — proposed tasks before creation.
 * The web/CLI confirms and then calls the create endpoint with this data.
 */
export const BreakdownPreviewResponseSchema = z.object({
  breakdown: BreakdownSchema,
  /** True when the LLM was unavailable and the breakdown fell back to a flat list. */
  isFallback: z.boolean().default(false),
});
export type BreakdownPreviewResponse = z.infer<typeof BreakdownPreviewResponseSchema>;

/**
 * Request body for the create-with-dependencies step (Theme B): a confirmed/edited
 * `Breakdown` to turn into a real, edge-wired board. The project path takes the
 * project from the URL; `repo` is an optional batch default applied to each task.
 */
export const CreateFromBreakdownRequestSchema = z.object({
  breakdown: BreakdownSchema,
  repo: z.string().optional(),
});
export type CreateFromBreakdownRequest = z.infer<typeof CreateFromBreakdownRequestSchema>;

/** Response for the create-from-breakdown step — the created, edge-wired tasks. */
export const CreateFromBreakdownResponseSchema = z.object({
  tasks: z.array(TaskSchema),
});
export type CreateFromBreakdownResponse = z.infer<typeof CreateFromBreakdownResponseSchema>;
