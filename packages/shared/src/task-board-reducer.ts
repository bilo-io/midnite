import type { Task } from './task.js';
import type { TaskBoardEvent } from './events/task.js';

/**
 * Pure board reducer for live WS updates (Phase 32 B2).
 *
 * Mirrors `applyWorkflowEvent` — seed from REST, then fold the event stream
 * through this function without re-fetching on every event.
 *
 * Returns `null` when the state is stale and a full REST refetch is needed
 * (e.g. `tasks.bulkCreated` carries only IDs, not full task objects).
 *
 * Never mutates the input array; always returns a new array or `null`.
 */
export function applyTaskEvent(tasks: Task[], event: TaskBoardEvent): Task[] | null {
  switch (event.type) {
    case 'task.created':
      // Deduplicate: if a race means we already have this task, update it.
      return tasks.some((t) => t.id === event.task.id)
        ? tasks.map((t) => (t.id === event.task.id ? event.task : t))
        : [...tasks, event.task];

    case 'task.updated':
      return tasks.map((t) => (t.id === event.task.id ? event.task : t));

    case 'task.deleted':
      return tasks.filter((t) => t.id !== event.id);

    case 'tasks.bulkCreated':
      // The event carries only IDs, not full objects — caller must refetch.
      return null;

    case 'agent.activity':
    case 'agent.attention':
    case 'guardrails.updated':
      // Ephemeral signal — no task-list change (the paused banner reads guardrail
      // state separately), no refetch needed.
      return tasks;
  }
}
