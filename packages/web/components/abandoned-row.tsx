'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Task } from '@midnite/shared';
import { TaskCard, type ProjectTagInfo } from '@/components/task-card';

export function AbandonedRow({
  tasks,
  onSelect,
  projectsById,
}: {
  tasks: Task[];
  onSelect?: (task: Task) => void;
  projectsById?: Map<string, ProjectTagInfo>;
}) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;
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
      {open && (
        <div className="grid max-h-[40vh] grid-cols-1 gap-2 overflow-y-auto p-3 pt-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              project={t.projectId ? projectsById?.get(t.projectId) : undefined}
              onSelect={onSelect ? () => onSelect(t) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
