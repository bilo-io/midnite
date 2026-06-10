'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Task } from '@midnite/shared';
import { TaskCard, type ProjectTagInfo } from '@/components/task-card';
import { TaskRow } from '@/components/task-row';

/**
 * Collapsible "Abandoned" section shown beneath each Tasks view. Its body mirrors
 * the active view type: a card grid for the board, task rows for the list/table.
 */
export function AbandonedRow({
  tasks,
  onSelect,
  projectsById,
  layout = 'board',
}: {
  tasks: Task[];
  onSelect?: (task: Task) => void;
  projectsById?: Map<string, ProjectTagInfo>;
  layout?: 'board' | 'list' | 'table';
}) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;
  const projectFor = (t: Task) => (t.projectId ? projectsById?.get(t.projectId) : undefined);
  return (
    <section className="shrink-0 rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 p-3 text-sm text-muted-foreground hover:bg-accent/50"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-medium uppercase tracking-wider">Abandoned</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{tasks.length}</span>
      </button>
      {open ? (
        layout === 'board' ? (
          <div className="grid max-h-[40vh] grid-cols-1 gap-2 overflow-y-auto p-3 pt-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                project={projectFor(t)}
                onSelect={onSelect ? () => onSelect(t) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="max-h-[40vh] overflow-y-auto border-t border-border/40">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                project={projectFor(t)}
                onSelect={onSelect ? () => onSelect(t) : undefined}
              />
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
