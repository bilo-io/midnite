import { StatusSchema, canTransition, type Status } from '@midnite/shared';

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

/**
 * Where a dragged task row should land when dropped on a status-keyed accordion
 * section (the list and table views key their sections by status, so the section
 * id *is* the candidate target). Returns the target status, or `null` when the
 * drop is a no-op or illegal: an unknown row, a drop on its own section, a section
 * id that isn't a status, or an edge {@link canTransition} rejects (e.g. anything
 * out of terminal `done`/`abandoned`). Callers can therefore hand a raw drop
 * straight here and act only on a non-null result — no round-trip to be refused.
 */
export function statusDropTarget(from: Status | undefined, sectionId: string): Status | null {
  const parsed = StatusSchema.safeParse(sectionId);
  if (!from || !parsed.success) return null;
  const to = parsed.data;
  if (from === to || !canTransition(from, to)) return null;
  return to;
}
