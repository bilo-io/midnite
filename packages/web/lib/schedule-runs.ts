import type { WorkflowRun, WorkflowTemplateSummary } from '@midnite/shared';

import { TASK_CREATE_TYPE } from './schedules';

// Phase 45 D — glue for surfacing a schedule's run history. Pure + unit-tested so
// the Schedules view stays thin.

/** The task a schedule run created, read from the `task.create` node's output. */
export interface CreatedTaskRef {
  id: string;
  title: string;
}

/**
 * Extract the board task a run created from its `task.create` node output (the
 * executor returns the full Task as the node output). Returns null if the run has
 * no successful task.create node yet (queued/failed-before-create) or the output
 * doesn't carry an id — so the UI can show the run without a dangling link.
 */
export function createdTaskFromRun(run: WorkflowRun): CreatedTaskRef | null {
  const node = run.nodeRuns.find((n) => n.nodeType === TASK_CREATE_TYPE);
  const output = node?.output;
  if (!output || typeof output !== 'object') return null;
  const task = output as { id?: unknown; title?: unknown };
  if (typeof task.id !== 'string') return null;
  return { id: task.id, title: typeof task.title === 'string' ? task.title : task.id };
}

/** The tag marking a system template as a task-creating schedule starter. */
export const RECURRING_TASK_TAG = 'recurring-task';

/**
 * The scheduling templates that belong in the Schedules "New from preset" menu:
 * scheduling-category system starters tagged as task-creating (so cleanup-style
 * scheduled workflows, which never create a task, don't appear — they'd install
 * and then vanish from the task-only Schedules list).
 */
export function schedulePresetTemplates(
  templates: WorkflowTemplateSummary[],
): WorkflowTemplateSummary[] {
  return templates.filter(
    (t) => t.category === 'scheduling' && t.tags.includes(RECURRING_TASK_TAG),
  );
}
