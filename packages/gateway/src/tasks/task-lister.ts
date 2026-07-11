import type { TaskSummary } from '@midnite/shared';

/**
 * Narrow terminal-task listing port (Phase 62 C). Lets the workflow
 * `midnite.list-completed-tasks` executor read the finished-task window WITHOUT
 * importing `TasksModule` (which imports `WorkflowsModule` for AI review — the
 * reverse edge would be a module cycle). Bound to `TasksService.listTerminalSummaries`
 * behind the `TASK_LISTER` token by a `@Global` module that resolves the service
 * lazily via `ModuleRef`, so there is no construction-time cycle. Returns the lean
 * P57 `TaskSummary` DTO (never a full hydrate).
 */
export interface TerminalTaskQuery {
  /** Window start (inclusive ISO). */
  from: string;
  /** Window end (inclusive ISO). */
  to: string;
  repo?: string;
  projectId?: string;
}

export interface TaskLister {
  listTerminal(query: TerminalTaskQuery): TaskSummary[];
}

export const TASK_LISTER = Symbol('TASK_LISTER');
