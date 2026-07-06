'use client';

import { useEffect } from 'react';
import type { Project, Task, TaskSummary } from '@midnite/shared';
import { TaskDetail } from '@/components/task-detail';

type Props = {
  task: Task;
  projects: Project[];
  /** The full board list — resolves blockers/dependents and feeds the add-blocker picker (Phase 27). */
  tasks: TaskSummary[];
  onClose: () => void;
};

/**
 * Modal shell around the shared {@link TaskDetail} surface (Phase 42): overlay
 * chrome + Escape-to-close. The detail body itself is reused by the `/tasks/:id`
 * full page, so this file owns only the modal-specific chrome.
 */
export function TaskThreadModal({ task, projects, tasks, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={task.title}
          className="pointer-events-auto flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <TaskDetail task={task} projects={projects} tasks={tasks} onClose={onClose} variant="modal" />
        </div>
      </div>
    </>
  );
}
