import {
  isNeedsAttention,
  type Task,
  type TaskEventTrigger,
  type TaskEventTriggerEvent,
} from '@midnite/shared';

/**
 * Phase 62 B — pure matching helpers for the task-event workflow trigger.
 * Keeping the event derivation + filter/team-scope checks side-effect-free lets
 * the subscriber stay thin and lets these rules be unit-tested in isolation.
 */

/** The task-event a task's current state represents, or `null` if none. */
export function taskEventForStatus(task: Task): TaskEventTriggerEvent | null {
  if (task.status === 'done') return 'task.done';
  if (task.status === 'abandoned') return 'task.abandoned';
  if (task.status === 'waiting' && isNeedsAttention(task.waitReason)) return 'task.needs-attention';
  return null;
}

/** Does the task satisfy the trigger's optional `filter` (omitted field = any)? */
export function matchesTaskEventFilter(task: Task, trigger: TaskEventTrigger): boolean {
  const filter = trigger.filter;
  if (!filter) return true;
  if (filter.repo !== undefined && task.repo !== filter.repo) return false;
  if (filter.projectId !== undefined && task.projectId !== filter.projectId) return false;
  if (filter.priority !== undefined && task.priority !== filter.priority) return false;
  return true;
}

/**
 * Team-scope: a teamless workflow (`workflowTeamId == null`) fires for any task;
 * a team-scoped workflow fires only for tasks of the same team. Mirrors how other
 * triggers respect team-scope.
 */
export function matchesTaskEventTeam(
  taskTeamId: string | null | undefined,
  workflowTeamId: string | null | undefined,
): boolean {
  if (workflowTeamId == null) return true;
  return taskTeamId === workflowTeamId;
}

/** The compact, versionable task summary handed to the run as trigger input. */
export function taskEventInput(task: Task, event: TaskEventTriggerEvent): {
  event: TaskEventTriggerEvent;
  task: {
    id: string;
    title: string;
    status: Task['status'];
    repo?: string;
    projectId?: string;
    teamId?: string;
    priority: number;
    prUrl?: string;
    waitReason?: Task['waitReason'];
  };
} {
  return {
    event,
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      repo: task.repo,
      projectId: task.projectId,
      teamId: task.teamId,
      priority: task.priority,
      prUrl: task.prUrl,
      waitReason: task.waitReason,
    },
  };
}
