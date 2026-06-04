'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, ListTree, Plus } from 'lucide-react';
import type { Project, Task } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/project-card';
import { ProjectModal } from '@/components/project-modal';
import { ProjectsTree } from '@/components/projects-tree';
import { PlanPanel } from '@/components/plan-panel';
import { cn } from '@/lib/utils';

type View = 'list' | 'grid' | 'table';
const VIEWS: readonly View[] = ['list', 'grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.projects.view';

export function ProjectsView({ initial, tasks }: { initial: Project[]; tasks: Task[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>('grid');
  const [creating, setCreating] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [planProject, setPlanProject] = useState<Project | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && (VIEWS as readonly string[]).includes(stored)) setView(stored as View);
  }, []);

  const onSetView = useCallback((next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  const refresh = useCallback(() => router.refresh(), [router]);

  const closeModal = useCallback(() => {
    setCreating(false);
    setEditProject(null);
  }, []);

  const modalOpen = creating || editProject !== null;

  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filtered = q
    ? initial.filter((p) =>
        [p.name, p.tag, p.description ?? ''].some((f) => f.toLowerCase().includes(q)),
      )
    : initial;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          {filtered.length} project{filtered.length === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => onSetView('list')}
              className={cn('h-7 w-7', view === 'list' && 'bg-accent text-accent-foreground')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => onSetView('grid')}
              className={cn('h-7 w-7', view === 'grid' && 'bg-accent text-accent-foreground')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Tree view"
              aria-pressed={view === 'table'}
              onClick={() => onSetView('table')}
              className={cn('h-7 w-7', view === 'table' && 'bg-accent text-accent-foreground')}
            >
              <ListTree className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No projects yet. Create one to group tasks, attach sources, and draft a plan.
          </p>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          No projects match “{q}”.
        </div>
      ) : view === 'table' ? (
        <ProjectsTree projects={filtered} tasks={tasks} />
      ) : view === 'list' ? (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              layout="list"
              onOpen={() => setEditProject(p)}
              onPlan={() => setPlanProject(p)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              layout="grid"
              onOpen={() => setEditProject(p)}
              onPlan={() => setPlanProject(p)}
            />
          ))}
        </div>
      )}

      {modalOpen ? (
        <ProjectModal
          project={creating ? null : editProject}
          onClose={closeModal}
          onSaved={refresh}
        />
      ) : null}

      {planProject ? (
        <PlanPanel
          project={planProject}
          onClose={() => setPlanProject(null)}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}
