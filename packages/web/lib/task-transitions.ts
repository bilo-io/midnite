import type { Status } from '@midnite/shared';

import { startTask, stopTask, updateTaskStatus } from '@/lib/api';

// The canonical status-transition rule, shared by the board (drag / D·A keys /
// bulk menu) and the contextual ⌘K commands (Phase 42 C) so the start/stop/update
// selection lives in exactly one place.

/** Moving `from`→`to` spawns an agent session (todo/backlog → wip). */
export function spawnsSession(from: Status, to: Status): boolean {
  return to === 'wip' && (from === 'todo' || from === 'backlog');
}

/** Moving `from`→`to` stops a running session (wip/waiting → todo/backlog). */
export function stopsSession(from: Status, to: Status): boolean {
  return (from === 'wip' || from === 'waiting') && (to === 'todo' || to === 'backlog');
}

/**
 * Apply a status transition via the right API call: `startTask` when it spawns a
 * session, `stopTask` when it stops one, `updateTaskStatus` otherwise. Pure routing
 * over the API — callers own optimistic UI, confirmation, and cache invalidation.
 */
export async function moveTask(from: Status, to: Status, taskId: string): Promise<void> {
  if (spawnsSession(from, to)) await startTask(taskId);
  else if (stopsSession(from, to)) await stopTask(taskId, to as 'todo' | 'backlog');
  else await updateTaskStatus(taskId, to);
}
