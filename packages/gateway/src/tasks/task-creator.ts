import type { Task } from '@midnite/shared';

/**
 * Narrow task-creation port. Lets non-tasks modules (the workflow `task.create`
 * executor) enqueue a board task WITHOUT importing `TasksModule` — which already
 * imports `WorkflowsModule` (Phase 37 AI review), so a direct dependency the other
 * way would be a module cycle. The binding (→ `TasksService.createFromPrompt`) is
 * provided behind the `TASK_CREATOR` token by a `@Global` module that resolves the
 * service lazily, so there is no construction-time cycle.
 */
export interface TaskCreatorInput {
  prompt: string;
  repo?: string;
  projectId?: string;
  /** 0–3 scheduling band; defaults to Normal (1) downstream. */
  priority?: number;
  /** Owner of the created task (e.g. the workflow's `createdBy`); team is derived from it. */
  createdBy?: string | null;
}

export interface TaskCreator {
  createTask(input: TaskCreatorInput): Promise<Task>;
}

export const TASK_CREATOR = Symbol('TASK_CREATOR');
