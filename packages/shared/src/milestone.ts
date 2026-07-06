import { z } from 'zod';

import { TaskSummarySchema } from './task.js';

/**
 * Phase 58 D — a **milestone**: a minimal, project-scoped plan structure.
 *
 * Deliberately **not** called a "phase" — that word means the `todo/` planning
 * docs. A milestone groups a project's tasks into an ordered lane; a task belongs
 * to at most one milestone (`task.milestoneId`, nullable). Progress (done/total)
 * is **computed**, never stored — mirroring how "blocked" and sessions are
 * derived. Team-scoped like every other domain (`createdBy`/`teamId`).
 */
export const MilestoneSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(8000).optional(),
  /** Ascending display order within the project; drives the roadmap lane order. */
  position: z.number().int().nonnegative(),
  /** Optional target date (ISO). Purely informational in v1 — no date-scheduling. */
  targetDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  teamId: z.string().optional(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const CreateMilestoneRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(8000).optional(),
  targetDate: z.string().optional(),
});
export type CreateMilestoneRequest = z.infer<typeof CreateMilestoneRequestSchema>;

export const UpdateMilestoneRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(8000).optional(),
  // Nullable so a client can clear the target date.
  targetDate: z.string().nullable().optional(),
});
export type UpdateMilestoneRequest = z.infer<typeof UpdateMilestoneRequestSchema>;

/** Full ordered id list — the service reassigns `position` 0..n-1 (Decision §1,
 *  mirroring `projects.reorderSources`). Must list every current milestone once. */
export const ReorderMilestonesRequestSchema = z.object({
  milestoneIds: z.array(z.string()).min(1),
});
export type ReorderMilestonesRequest = z.infer<typeof ReorderMilestonesRequestSchema>;

/** Assign (or unassign, with `null`) a task to a milestone. */
export const AssignMilestoneRequestSchema = z.object({
  milestoneId: z.string().nullable(),
});
export type AssignMilestoneRequest = z.infer<typeof AssignMilestoneRequestSchema>;

export const MilestoneResponseSchema = z.object({ milestone: MilestoneSchema });
export type MilestoneResponse = z.infer<typeof MilestoneResponseSchema>;

/**
 * A milestone enriched with computed progress + its tasks (lean {@link TaskSummary}
 * projections — Decision §3, consistent with the paged `GET /tasks`). `done`/`total`
 * are computed from the tasks, never stored.
 */
export const RoadmapMilestoneSchema = MilestoneSchema.extend({
  /** Tasks whose status is `done`. */
  done: z.number().int().nonnegative(),
  /** Total tasks assigned to this milestone. */
  total: z.number().int().nonnegative(),
  tasks: z.array(TaskSummarySchema),
});
export type RoadmapMilestone = z.infer<typeof RoadmapMilestoneSchema>;

/**
 * The roadmap for a project: its milestones (ordered, with progress + tasks) plus
 * an **unassigned backlog** lane of project tasks with no milestone.
 */
export const RoadmapViewSchema = z.object({
  projectId: z.string(),
  milestones: z.array(RoadmapMilestoneSchema),
  /** Project tasks not assigned to any milestone. */
  backlog: z.array(TaskSummarySchema),
});
export type RoadmapView = z.infer<typeof RoadmapViewSchema>;

export const RoadmapResponseSchema = z.object({ roadmap: RoadmapViewSchema });
export type RoadmapResponse = z.infer<typeof RoadmapResponseSchema>;
