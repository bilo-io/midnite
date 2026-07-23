'use client';

import { useState } from 'react';
import { Ban, Check, Play, RotateCcw, SquareTerminal, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Task, TaskSummary } from '@midnite/shared';
import { HoverExpandButton } from '@/components/hover-expand-button';
import { ExportMenu } from '@/components/export-menu';
import { useConfirm } from '@/components/confirm-dialog';
import { deleteTask, exportTask, reopenTask, startTask, updateTaskStatus } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { unmetBlockerCount } from '@/lib/task-dependencies';
import { cn } from '@/lib/utils';

/**
 * The task lifecycle mutations (start / abandon / reopen / delete) with their
 * confirm flows and shared busy + error state, extracted so both the task-detail
 * surface (modal + full page) and the session cockpit drive them identically.
 * `onActionComplete` fires after a successful mutation — the modal closes, the
 * session page refreshes.
 */
export type TaskActionsController = {
  start: () => Promise<void>;
  markDone: () => Promise<void>;
  abandon: () => Promise<void>;
  reopen: () => Promise<void>;
  remove: () => Promise<void>;
  statusBusy: boolean;
  statusError: string | null;
  setStatusError: (value: string | null) => void;
};

export function useTaskActions({
  task,
  tasksById,
  onActionComplete,
}: {
  task: Task;
  /** The board list keyed by id — feeds the manual-start blocker confirm. Omit
   *  (or pass empty) where the list isn't loaded; the blocker check is skipped. */
  tasksById?: Map<string, TaskSummary>;
  onActionComplete?: () => void;
}): TaskActionsController {
  const t = useTranslations('task');
  const tBoard = useTranslations('board');
  const confirm = useConfirm();
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Manual kickoff: spawn an agent session now (todo/backlog → wip). The gateway
  // 409s when no slot is free; surface that as a non-fatal message. Starting a
  // blocked task is a human override (Phase 27) — warn + confirm first.
  const start = async () => {
    const unmet = tasksById && tasksById.size > 0 ? unmetBlockerCount(task, tasksById) : 0;
    if (unmet > 0) {
      const ok = await confirm({
        title: tBoard('confirm.startBlockedTitle'),
        description: tBoard('confirm.startBlockedDescription', { count: unmet }),
        confirmLabel: tBoard('confirm.startBlockedConfirm'),
      });
      if (!ok) return;
    }
    setStatusBusy(true);
    setStatusError(null);
    try {
      await startTask(task.id);
      invalidateData();
      onActionComplete?.();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : t('actions.startFailed'));
    } finally {
      setStatusBusy(false);
    }
  };

  // Manual completion (Phase 82): mark a running/queued task done without waiting
  // for the agent to finish. Only offered where `done` is a legal edge (Phase 60 E) —
  // `backlog` has no direct edge to `done`, so the button hides itself there.
  const markDone = async () => {
    const ok = await confirm({
      title: t('actions.markDoneTitle'),
      description: t('actions.markDoneDescription'),
      confirmLabel: t('actions.markDoneConfirm'),
    });
    if (!ok) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      await updateTaskStatus(task.id, 'done');
      invalidateData();
      onActionComplete?.();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : t('actions.markDoneFailed'));
    } finally {
      setStatusBusy(false);
    }
  };

  const abandon = async () => {
    const ok = await confirm({
      title: t('actions.abandonTitle'),
      description: t('actions.abandonDescription'),
      confirmLabel: t('actions.abandonConfirm'),
    });
    if (!ok) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      await updateTaskStatus(task.id, 'abandoned'); // gateway auto-archives the session
      invalidateData();
      onActionComplete?.();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : t('actions.abandonFailed'));
    } finally {
      setStatusBusy(false);
    }
  };

  // Reopen a terminal task (Phase 69 E): done/abandoned → todo. Clears the
  // session binding + retry state and re-blocks dependents; PR history is kept.
  const reopen = async () => {
    const ok = await confirm({
      title: tBoard('confirm.reopenTitle'),
      description: tBoard('confirm.reopenDescription'),
      confirmLabel: tBoard('confirm.reopenConfirm'),
    });
    if (!ok) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      await reopenTask(task.id);
      invalidateData();
      onActionComplete?.();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : t('actions.reopenFailed'));
    } finally {
      setStatusBusy(false);
    }
  };

  // Permanent delete — only offered once the task is archived (e.g. abandoned).
  const remove = async () => {
    setStatusBusy(true);
    setStatusError(null);
    try {
      await deleteTask(task.id);
      invalidateData();
      onActionComplete?.();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : t('actions.deleteFailed'));
      setStatusBusy(false);
    }
  };

  return { start, markDone, abandon, reopen, remove, statusBusy, statusError, setStatusError };
}

/** Slugged base name for the export download / print title. */
export function taskExportFilename(task: Task): string {
  return (
    (task.title.trim() || 'task')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'task'
  );
}

/**
 * The task's lifecycle actions rendered as a row of icon-only controls that reveal
 * their label on hover/focus (the {@link HoverExpandButton} pattern). Shared by the
 * work-item modal's tab strip, the full task page header, and the session cockpit.
 * The mutations come from {@link useTaskActions}; this component is presentational.
 */
export function TaskActionButtons({
  task,
  actions,
  /** Show a Session deep-link (contexts where the session lives at its own route). */
  showSession = false,
  onOpenSession,
  className,
}: {
  task: Task;
  actions: TaskActionsController;
  showSession?: boolean;
  onOpenSession?: () => void;
  className?: string;
}) {
  const t = useTranslations('task');
  const confirm = useConfirm();
  const { start, markDone, abandon, reopen, remove, statusBusy } = actions;
  const canStart = task.status === 'todo' || task.status === 'backlog';
  const canReopen = task.status === 'done' || task.status === 'abandoned';
  // `done` is a legal edge from todo/wip/waiting only (backlog has none — see
  // ALLOWED_TRANSITIONS in @midnite/shared/task.ts); done/abandoned are terminal.
  const canMarkDone = task.status === 'todo' || task.status === 'wip' || task.status === 'waiting';

  const confirmRemove = async () => {
    const ok = await confirm({
      title: t('actions.deleteTitle'),
      description: t('actions.deleteDescription'),
      confirmLabel: t('actions.deleteConfirm'),
    });
    if (ok) void remove();
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {canStart ? (
        <HoverExpandButton
          icon={<Play className="h-3.5 w-3.5" />}
          label={t('actions.start')}
          variant="secondary"
          onClick={() => void start()}
          disabled={statusBusy}
        />
      ) : null}
      {canReopen ? (
        <HoverExpandButton
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          label={t('actions.reopen')}
          variant="secondary"
          onClick={() => void reopen()}
          disabled={statusBusy}
        />
      ) : null}
      {showSession && onOpenSession ? (
        <HoverExpandButton
          icon={<SquareTerminal className="h-3.5 w-3.5" />}
          label={t('actions.session')}
          variant="secondary"
          onClick={onOpenSession}
        />
      ) : null}
      {canMarkDone ? (
        <HoverExpandButton
          icon={<Check className="h-4 w-4" />}
          label={t('actions.markDone')}
          variant="ghost"
          onClick={() => void markDone()}
          disabled={statusBusy}
          className="text-success hover:bg-success/15 hover:text-success"
        />
      ) : null}
      <ExportMenu fetchMarkdown={() => exportTask(task.id)} filename={taskExportFilename(task)} hoverExpand />
      {task.status !== 'abandoned' ? (
        <HoverExpandButton
          icon={<Ban className="h-4 w-4" />}
          label={t('actions.abandon')}
          variant="ghost"
          onClick={() => void abandon()}
          disabled={statusBusy}
          className="text-muted-foreground hover:text-destructive"
        />
      ) : null}
      {task.archivedAt ? (
        <HoverExpandButton
          icon={<Trash2 className="h-4 w-4" />}
          label={t('actions.delete')}
          variant="ghost"
          onClick={() => void confirmRemove()}
          className="text-destructive hover:bg-destructive/15 hover:text-destructive"
        />
      ) : null}
    </div>
  );
}
