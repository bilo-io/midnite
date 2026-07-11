import type { RetroNarrative, Task, TaskRetro } from '@midnite/shared';

/**
 * Narrow retrospective port (Phase 62 C). Lets the workflow `generate-retro` /
 * `build-digest` executors read + augment retros WITHOUT importing `RetroModule`
 * (which imports `TasksModule`, which imports `WorkflowsModule` — a cycle). Bound
 * lazily to {@link RetroBuilderService} via `ModuleRef`, mirroring `TASK_CREATOR`.
 */
export interface RetroPort {
  /** The stored retro for a task, or `undefined` if none has been built. */
  get(taskId: string): TaskRetro | undefined;
  /** Build + store the deterministic skeleton for a terminal task. */
  buildAndStore(task: Task): TaskRetro;
  /** Attach an LLM narrative to a task's stored retro; `undefined` if no skeleton. */
  storeNarrative(taskId: string, narrative: RetroNarrative): TaskRetro | undefined;
}

export const RETRO_PORT = Symbol('RETRO_PORT');
