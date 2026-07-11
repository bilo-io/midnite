import type { RetroNarrative, TaskRetro } from '@midnite/shared';

/**
 * Narrow retro-narrative port (Phase 62 C). Lets the workflow `midnite.generate-retro`
 * executor fetch a task's retro skeleton + a bounded transcript excerpt and persist
 * the LLM narrative WITHOUT importing `RetroModule`/`SessionsModule` (both import
 * `TasksModule`, which imports `WorkflowsModule` — the reverse edge would be a
 * module cycle). Bound behind the `RETRO_ACCESSOR` token by a `@Global` module
 * that resolves the services lazily via `ModuleRef`.
 */
export interface RetroForNarrative {
  retro: TaskRetro;
  /** Bounded transcript excerpt for the task's session; `''` when unavailable. */
  transcriptExcerpt: string;
}

export interface RetroAccessor {
  /**
   * The retro skeleton for a task (building it on demand when the task is terminal
   * but has no stored retro), plus a bounded transcript excerpt. `undefined` when
   * the task is unknown or not terminal.
   */
  loadForNarrative(taskId: string): Promise<RetroForNarrative | undefined>;
  /** Persist an LLM narrative onto the stored retro. */
  storeNarrative(taskId: string, narrative: RetroNarrative): void;
}

export const RETRO_ACCESSOR = Symbol('RETRO_ACCESSOR');
