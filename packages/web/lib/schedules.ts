import type {
  ScheduleTrigger,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowSummary,
} from '@midnite/shared';

import type { WorkflowGraphPayload } from './workflow-store';

// Phase 45 C — the "Schedules" facade.
//
// A "recurring task" is not a new entity: it's an ordinary workflow shaped as
// `[trigger.schedule] → [task.create]` (Decision §1). This module holds the pure
// glue the facade needs — recognising those workflows in a list, and building /
// decoding the 2-node graph from a friendly form — so the view stays thin and the
// round-trip (Decision §3) is unit-testable without React.

/** The form values a schedule's quick-create / edit dialog round-trips. */
export interface ScheduleFormValues {
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  /** The `task.create` action's params. */
  prompt: string;
  repo: string;
  projectId: string;
  priority: number;
}

export const DEFAULT_SCHEDULE_FORM: ScheduleFormValues = {
  name: '',
  cron: '0 9 * * *',
  timezone: 'UTC',
  enabled: true,
  prompt: '',
  repo: '',
  projectId: '',
  priority: 1,
};

/** The node type the facade keys off — a schedule whose action enqueues a task. */
export const TASK_CREATE_TYPE = 'task.create';

/**
 * A workflow summary is a "schedule" (in the facade's sense) when it's
 * schedule-triggered *and* contains a `task.create` action. Filtered purely from
 * `WorkflowSummary` (`triggerType` + `steps`), so no schema marker is needed
 * (Decision §2).
 */
export function isScheduleWorkflow(summary: WorkflowSummary): boolean {
  return (
    summary.triggerType === 'schedule' &&
    summary.steps.some((s) => s.type === TASK_CREATE_TYPE)
  );
}

/** The `task.create` node's params, as a strongly-keyed object for `updateWorkflow`. */
function taskCreateParams(values: ScheduleFormValues): Record<string, unknown> {
  const params: Record<string, unknown> = { prompt: values.prompt.trim() };
  if (values.repo.trim()) params.repo = values.repo.trim();
  if (values.projectId.trim()) params.projectId = values.projectId.trim();
  // Only carry priority when it diverges from the Normal default, keeping the
  // stored params minimal and matching what a hand-built node would hold.
  if (values.priority !== 1) params.priority = values.priority;
  return params;
}

/** The schedule trigger a form compiles to. */
export function scheduleTriggerOf(values: ScheduleFormValues): ScheduleTrigger {
  return { type: 'schedule', cron: values.cron, timezone: values.timezone || 'UTC' };
}

/**
 * Build the `[trigger.schedule] → [task.create]` graph for a workflow, preserving
 * the existing trigger node (the gateway seeds one on create) and any existing
 * `task.create` node's id/position so an edit is a true round-trip rather than a
 * replace. `makeId` is injectable for deterministic tests.
 */
export function buildScheduleGraph(
  workflow: Pick<Workflow, 'nodes'>,
  values: ScheduleFormValues,
  makeId: () => string = () => crypto.randomUUID(),
): WorkflowGraphPayload {
  const triggerNode: WorkflowNode = workflow.nodes.find((n) => n.type.startsWith('trigger.')) ?? {
    id: makeId(),
    type: 'trigger.schedule',
    label: 'Schedule',
    position: { x: 80, y: 120 },
    params: {},
  };

  const existing = workflow.nodes.find((n) => n.type === TASK_CREATE_TYPE);
  const taskNode: WorkflowNode = {
    id: existing?.id ?? makeId(),
    type: TASK_CREATE_TYPE,
    label: existing?.label ?? 'Create task',
    position: existing?.position ?? { x: triggerNode.position.x + 240, y: triggerNode.position.y },
    params: taskCreateParams(values),
  };

  // A single edge wires the trigger to the action.
  const edge: WorkflowEdge = {
    id: makeId(),
    source: triggerNode.id,
    sourcePort: 'main',
    target: taskNode.id,
    targetPort: 'main',
  };

  return { nodes: [triggerNode, taskNode], edges: [edge] };
}

/**
 * Decode a full workflow back into form values for editing — the inverse of
 * `buildScheduleGraph` for the fields the facade owns. Falls back to defaults for
 * anything missing so a hand-edited or partial workflow still opens cleanly.
 */
export function decodeSchedule(workflow: Workflow): ScheduleFormValues {
  const task = workflow.nodes.find((n) => n.type === TASK_CREATE_TYPE);
  const params = (task?.params ?? {}) as Record<string, unknown>;
  const trigger = workflow.trigger;
  const priority = typeof params.priority === 'number' ? params.priority : 1;
  return {
    name: workflow.name,
    cron: trigger.type === 'schedule' ? trigger.cron : DEFAULT_SCHEDULE_FORM.cron,
    timezone: trigger.type === 'schedule' ? trigger.timezone : DEFAULT_SCHEDULE_FORM.timezone,
    enabled: workflow.enabled,
    prompt: typeof params.prompt === 'string' ? params.prompt : '',
    repo: typeof params.repo === 'string' ? params.repo : '',
    projectId: typeof params.projectId === 'string' ? params.projectId : '',
    priority,
  };
}
