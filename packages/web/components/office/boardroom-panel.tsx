'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ChevronRight, Presentation, X } from 'lucide-react';
import type { Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { ProjectTag } from '@/components/project-tag';
import { ProjectModal } from '@/components/project-modal';
import { Spinner } from '@/components/spinner';
import { getMemories, getProjects, getTasks } from '@/lib/api';
import { taskModalHref } from '@/lib/task-route';
import { invalidateData } from '@/lib/data-refresh';
import { useApiData } from '@/lib/use-api-data';
import { boardroomProjects } from '@/lib/office/projects';

/**
 * The board room: the office's **projects hub**. Lists the live projects;
 * clicking one opens the full {@link ProjectModal} overlaid on the office (no
 * navigation — the URL stays `/office`), so plans, sources, tasks, and the
 * project's memory are all reachable without leaving the room. Opened from the
 * Phaser scene when the player walks up to the whiteboard; Escape/close returns
 * to the room (and, when a project is open, first returns to the project list).
 */
export function BoardroomPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data, error, loading } = useApiData(() =>
    Promise.all([getProjects(), getTasks(), getMemories()]),
  );
  const [selected, setSelected] = useState<Project | null>(null);

  const [projects, tasks, memories] = data ?? [[], [], []];
  const active = useMemo(() => boardroomProjects(projects), [projects]);

  // Own Escape so it closes the panel (Phaser's keyboard is disabled while open).
  // While a project modal is open it owns Escape (and closes itself back to the
  // list), so this only closes the room when no project is selected.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selected) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose, selected]);

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Board room"
        className="animate-dialog-in relative flex max-h-[88%] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <Presentation className="h-4 w-4 text-muted-foreground" />
          <h2 className="flex-1 text-sm font-semibold">Board Room</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Couldn’t load projects — {error}</p>
          ) : active.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {active.map((project) => {
                const count = project.taskCount ?? tasks.filter((t) => t.projectId === project.id).length;
                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(project)}
                      className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted/50"
                    >
                      <ProjectTag tag={project.tag} color={project.color} />
                      <span className="min-w-0 flex-1 truncate text-sm">{project.name}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {count} task{count === 1 ? '' : 's'}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {selected && typeof document !== 'undefined'
        ? createPortal(
            <ProjectModal
              project={selected}
              tasks={tasks.filter((t) => t.projectId === selected.id)}
              memories={memories}
              onSelectTask={(task) => router.push(taskModalHref(task.id))}
              onClose={() => setSelected(null)}
              onSaved={invalidateData}
            />,
            document.body,
          )
        : null}
    </div>
  );
}
