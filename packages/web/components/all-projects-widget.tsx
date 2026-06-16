'use client';

import { LayoutGrid, RefreshCw } from 'lucide-react';
import { getProjects, getTasks } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { ProjectCard } from './recent-projects';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;

export function AllProjectsWidget() {
  const projects = usePolling(() => getProjects(), REFRESH_MS);
  const tasks = usePolling(() => getTasks(), REFRESH_MS);

  const refresh = () => {
    projects.refresh();
    tasks.refresh();
  };

  const list = (projects.data ?? [])
    .filter((p) => !p.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <WidgetCard
      title="All projects"
      icon={LayoutGrid}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh projects"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', (projects.loading || tasks.loading) && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto p-3"
    >
      {projects.error && !projects.data ? (
        <p className="py-6 text-center text-sm text-destructive">Couldn’t load projects.</p>
      ) : !projects.data && projects.loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((project) => (
            <div key={project.id} className="min-h-[150px]">
              <ProjectCard project={project} tasks={tasks.data ?? []} />
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
