'use client';

import { useMemo } from 'react';
import { CircleDot, Pause, PlayCircle, XCircle, type LucideIcon } from 'lucide-react';
import type { Status, Task, TaskSummary } from '@midnite/shared';

import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';
import { invalidateData } from '@/lib/data-refresh';
import { useRegisterPaletteCommands, type PaletteCommand } from '@/lib/palette-commands';
import { unmetBlockerCount } from '@/lib/task-dependencies';
import { moveTask } from '@/lib/task-transitions';

// Phase 42 C — contextual "Move to…" commands, registered in ⌘K only while a task
// detail surface is mounted (the modal or the full page). Populates Phase 41's
// command registry, which had no per-task context to hang commands on until now.

type MoveCommand = { target: Status; label: string; Icon: LucideIcon };

const MOVE_COMMANDS: MoveCommand[] = [
  { target: 'wip', label: 'Move to in progress', Icon: PlayCircle },
  { target: 'done', label: 'Mark done', Icon: CircleDot },
  { target: 'waiting', label: 'Move to waiting', Icon: Pause },
  { target: 'abandoned', label: 'Abandon task', Icon: XCircle },
];

/**
 * Register the per-task "Move to…" palette commands for `task` while the calling
 * component is mounted. Each command routes through the shared `moveTask` helper
 * (same start/stop/update logic as the board), confirming an abandon or a
 * blocked-start exactly as the detail surface and board do. `tasks` is the full
 * board list — needed to count unmet blockers for the start confirmation.
 */
export function useTaskPaletteCommands(task: Task, tasks: TaskSummary[]): void {
  const confirm = useConfirm();
  const toast = useToast();

  const commands = useMemo<PaletteCommand[]>(() => {
    const apply = async (target: Status) => {
      if (target === 'abandoned') {
        const ok = await confirm({
          title: 'Abandon this task?',
          description: 'It will be archived and its session stopped.',
          confirmLabel: 'Abandon',
        });
        if (!ok) return;
      }
      // Manually starting a task whose blockers aren't done is a human override
      // (Phase 27) — mirror the board's confirm.
      if (target === 'wip') {
        const tasksById = new Map(tasks.map((t) => [t.id, t] as const));
        const unmet = unmetBlockerCount(task, tasksById);
        if (unmet > 0) {
          const ok = await confirm({
            title: 'Start a blocked task?',
            description: `${unmet} blocker${unmet === 1 ? " isn't" : "s aren't"} done yet. Starting it manually runs it anyway.`,
            confirmLabel: 'Start anyway',
          });
          if (!ok) return;
        }
      }
      try {
        await moveTask(task.status, target, task.id);
        invalidateData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to move task');
      }
    };

    // Skip the command that matches the task's current status — moving to where it
    // already is would be a no-op.
    return MOVE_COMMANDS.filter((c) => c.target !== task.status).map((c) => ({
      id: `task-move-${c.target}`,
      label: c.label,
      Icon: c.Icon,
      keywords: ['move', 'status', c.target, task.title],
      action: () => void apply(c.target),
    }));
  }, [task, tasks, confirm, toast]);

  useRegisterPaletteCommands('task-detail', commands);
}
