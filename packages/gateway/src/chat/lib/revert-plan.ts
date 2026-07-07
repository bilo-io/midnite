import type { Status } from '@midnite/shared';
import type { TasksService } from '../../tasks/tasks.service';

/**
 * Phase 59 F — a single inverse operation captured when a chat command mutates the
 * board, replayed (in order) to undo it. Each op maps to an existing TasksService
 * call, so undo goes through the same validated paths as the forward command (no
 * new mutation path). Created tasks are deleted; field changes restore the value
 * captured *before* the command ran.
 */
export type RevertOp =
  | { kind: 'delete'; taskId: string }
  | { kind: 'restorePriority'; taskId: string; priority: number }
  | { kind: 'restoreStatus'; taskId: string; status: Status }
  | { kind: 'restoreRepo'; taskId: string; repo: string | null }
  | { kind: 'restoreProject'; taskId: string; projectId: string | null }
  | { kind: 'removeDependency'; taskId: string; dependsOnId: string };

/** Apply one revert op via the existing TasksService mutators. */
export function applyRevert(tasks: TasksService, op: RevertOp): void {
  switch (op.kind) {
    case 'delete':
      // Undo of a create = remove the task. `deleteTask` guards against deleting
      // live work (requires an archived row), so archive first, then hard-delete.
      tasks.archive(op.taskId);
      tasks.deleteTask(op.taskId);
      return;
    case 'restorePriority':
      tasks.setPriority(op.taskId, op.priority);
      return;
    case 'restoreStatus':
      tasks.updateStatus(op.taskId, op.status);
      return;
    case 'restoreRepo':
      tasks.setRepo(op.taskId, op.repo);
      return;
    case 'restoreProject':
      tasks.setProject(op.taskId, op.projectId);
      return;
    case 'removeDependency':
      tasks.removeDependency(op.taskId, op.dependsOnId);
      return;
  }
}
