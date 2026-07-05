'use client';

import type { Task } from '@midnite/shared';
import { TaskRow } from '@/components/task-row';

type Props = {
  tasks: Task[];
  /** Open a task; rows are static when omitted. */
  onSelectTask?: (task: Task) => void;
};

/**
 * The project's tasks (Phase 55 B) — extracted from the modal's Tasks tab so the
 * modal and the detail page render the identical list. Layout-agnostic.
 */
export function ProjectTasksPanel({ tasks, onSelectTask }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        No tasks in this project yet.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} onSelect={onSelectTask ? () => onSelectTask(t) : undefined} showStatus />
      ))}
    </div>
  );
}
