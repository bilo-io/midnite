import type { Task, TaskSummary } from '@midnite/shared';

/**
 * Narrow task-read port (Phase 62 C). Lets the workflow retro/digest node
 * executors read tasks WITHOUT importing `TasksModule` — which already imports
 * `WorkflowsModule` (Phase 37 AI review), so a direct dependency the other way is
 * a module cycle. Mirrors {@link TASK_CREATOR}: the binding resolves `TasksService`
 * lazily via `ModuleRef`, so there's no construction-time cycle.
 */
export interface CompletedTasksQuery {
  /** Window start (ISO, inclusive). */
  from: string;
  /** Window end (ISO, inclusive). */
  to: string;
  repo?: string;
  projectId?: string;
}

export interface TaskReader {
  /** A task by id, or `undefined` when it doesn't exist. */
  getTask(id: string): Task | undefined;
  /** Terminal (done/abandoned) tasks whose last update falls in the window. */
  listCompleted(query: CompletedTasksQuery): TaskSummary[];
}

export const TASK_READER = Symbol('TASK_READER');
