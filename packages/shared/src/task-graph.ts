import { z } from 'zod';
import { StatusSchema } from './task.js';

/**
 * Phase 58 A — the dependency graph as server-authoritative data, computed from
 * the `task_dependencies` edges + tasks. `ready`/`unmetBlockerCount` use the same
 * readiness logic the scheduler sees, so a node's state matches the board exactly.
 *
 * Edge direction: `from` (the dependent task) → `to` (its blocker,
 * `dependsOnTaskId`). A `foreign` node is a blocker pulled in from outside a
 * `?projectId=` filter so the dependency stays visible (flagged, not hidden).
 */
export const TaskGraphNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: StatusSchema,
  priority: z.number().int(),
  /** True only for a `todo` task whose every blocker is `done` — i.e. spawnable now. */
  ready: z.boolean(),
  /** Blockers not yet `done`. */
  unmetBlockerCount: z.number().int().nonnegative(),
  projectId: z.string().optional(),
  /** Phase 58 D — milestone assignment; always absent until then. */
  milestoneId: z.string().optional(),
  /** A blocker outside the requested `projectId` scope, included for context. */
  foreign: z.boolean().optional(),
});
export type TaskGraphNode = z.infer<typeof TaskGraphNodeSchema>;

export const TaskGraphEdgeSchema = z.object({
  /** The dependent task. */
  from: z.string(),
  /** The blocker it depends on (`dependsOnTaskId`). */
  to: z.string(),
});
export type TaskGraphEdge = z.infer<typeof TaskGraphEdgeSchema>;

export const TaskGraphSchema = z.object({
  nodes: z.array(TaskGraphNodeSchema),
  edges: z.array(TaskGraphEdgeSchema),
  /** True when the in-scope task count exceeded the node cap (no silent truncation). */
  truncated: z.boolean(),
  /** Total in-scope task count before the cap. */
  totalCount: z.number().int().nonnegative(),
});
export type TaskGraph = z.infer<typeof TaskGraphSchema>;

export const TaskGraphResponseSchema = z.object({ graph: TaskGraphSchema });
export type TaskGraphResponse = z.infer<typeof TaskGraphResponseSchema>;

/** Max nodes returned; beyond this the graph is truncated + flagged. */
export const TASK_GRAPH_NODE_CAP = 500;
