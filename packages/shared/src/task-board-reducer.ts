import type { TaskBoardEvent } from './events/task.js';
import type { Task } from './task.js';

// Apply a single live `TaskBoardEvent` to the current board, returning a NEW array
// (never mutating the input). This is the pure core of live board streaming: the
// CLI `watch` dashboard seeds a snapshot from REST (`GET /tasks`), then folds the
// `/ws/tasks` event stream through this reducer to keep the board live without a
// refetch per event. It lives in `shared` because it's contract-shaped state
// derivation — unit-testable and reusable (the web board could fold events through
// it later instead of invalidate-and-refetch). Mirrors `applyWorkflowEvent`.
//
// `null` is the "stale — reseed from REST" signal:
// - `tasks.bulkCreated` (Phase 16) coalesces a batch into ONE signal carrying only
//   the new ids, so the full task objects aren't available to patch in — the caller
//   should refetch the board.
// - A `null` board stays `null` for the patch events (nothing to fold into yet); the
//   caller seeds from REST first, then folds.
export function applyTaskEvent(board: Task[] | null, event: TaskBoardEvent): Task[] | null {
  switch (event.type) {
    case 'task.created':
    case 'task.updated': {
      if (board === null) return null;
      // Upsert by id: both events carry the full task, so replace in place when the
      // id is already present, else append. Idempotent — a re-delivered `created`, or
      // an `updated` for a task added while disconnected, both land correctly.
      const idx = board.findIndex((t) => t.id === event.task.id);
      if (idx === -1) return [...board, event.task];
      const next = board.slice();
      next[idx] = event.task;
      return next;
    }
    case 'task.deleted':
      if (board === null) return null;
      return board.filter((t) => t.id !== event.id);
    case 'tasks.bulkCreated':
      // Only ids — the full tasks aren't in the payload, so signal a reseed.
      return null;
  }
}
