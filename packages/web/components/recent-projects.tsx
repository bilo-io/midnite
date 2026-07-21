'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, FolderKanban } from 'lucide-react';
import type { Project, Status, TaskSummary } from '@midnite/shared';
import { ProjectModal } from '@/components/project-modal';
import { ProjectProgressBar } from '@/components/project-progress';
import { invalidateData } from '@/lib/data-refresh';
import { ProjectTag } from '@/components/project-tag';
import { StatusDonut, statusCounts } from '@/components/status-donut';
import { cn } from '@/lib/utils';
import { taskModalHref } from '@/lib/task-route';

export const RECENT_LIMIT = 3;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

interface ProjectCardProps {
  /** The project to show. Undefined → render the empty "choose a project" state. */
  project?: Project;
  tasks: TaskSummary[];
  // Configurable-card mode (dashboard): supply the full project list + a setter to
  // enable the per-card project picker.
  projects?: Project[];
  onSelectProject?: (projectId: string | null) => void;
}

/** A small dropdown to pick which project a configurable card shows. */
function ProjectPicker({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose project"
        className="flex h-6 w-6 items-center justify-center rounded-md bg-background/70 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronsUpDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 max-h-60 w-48 overflow-auto rounded-md border bg-popover p-1 shadow-md">
            {projects.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No projects</p>
            ) : (
              projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent',
                    p.id === selectedId && 'bg-accent',
                  )}
                >
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                  <span className="truncate">{p.name}</span>
                </button>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ProjectCard({ project, tasks, projects, onSelectProject }: ProjectCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const projectTasks = useMemo(
    () => (project ? tasks.filter((t) => t.projectId === project.id) : []),
    [tasks, project],
  );

  const countsMap = useMemo(() => {
    const map = new Map<Status, number>();
    for (const t of projectTasks) map.set(t.status, (map.get(t.status) ?? 0) + 1);
    return map;
  }, [projectTasks]);

  const counts = statusCounts(countsMap);
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const doneCount = counts.find((c) => c.status === 'done')?.count ?? 0;
  const legend = counts.filter((c) => c.count > 0);

  const picker =
    onSelectProject && projects ? (
      <ProjectPicker
        projects={projects}
        selectedId={project?.id ?? null}
        onSelect={(id) => onSelectProject(id)}
      />
    ) : null;

  // Configurable card with nothing to show yet (no projects, or the pinned one
  // was deleted): a compact "pick a project" prompt.
  if (!project) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed surface-glass p-4 text-center">
        <FolderKanban className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">No project selected</p>
        {picker}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" style={{ ['--proj-color' as string]: project.color }}>
      {picker ? <div className="absolute right-9 top-1.5 z-20">{picker}</div> : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-full w-full flex-col gap-3 overflow-hidden rounded-xl border surface-glass-interactive p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ backgroundImage: 'linear-gradient(to right, transparent, var(--proj-color), transparent)' }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-40"
          style={{ background: 'var(--proj-color)' }}
        />

        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="w-fit">
              <ProjectTag tag={project.tag} color={project.color} />
            </span>
            <span className="line-clamp-1 text-sm font-semibold leading-snug">{project.name}</span>
            {project.description ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
            ) : (
              <p className="text-xs italic text-muted-foreground">No description</p>
            )}
          </div>
          <StatusDonut counts={counts} total={total} />
        </div>

        {legend.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {legend.map((c) => (
              <span key={c.status} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: `hsl(var(${c.hueVar}))` }} />
                {c.label}
                <span className="tabular-nums text-foreground">{c.count}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">No tasks yet</p>
        )}

        <ProjectProgressBar done={doneCount} total={total} hideLabel />

        <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/40 pt-2">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            Updated {relativeTime(project.updatedAt)}
          </span>
        </div>
      </button>

      {open && (
        <ProjectModal
          project={project}
          tasks={projectTasks}
          onSelectTask={(task) => router.push(taskModalHref(task.id))}
          onClose={() => setOpen(false)}
          onSaved={() => invalidateData()}
        />
      )}
    </div>
  );
}

export function RecentProjects({ projects, tasks }: { projects: Project[]; tasks: TaskSummary[] }) {
  const router = useRouter();
  const [editProject, setEditProject] = useState<Project | null>(null);

  const countsByProject = useMemo(() => {
    const map = new Map<string, Map<Status, number>>();
    for (const t of tasks) {
      if (!t.projectId) continue;
      const byStatus = map.get(t.projectId) ?? new Map<Status, number>();
      byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
      map.set(t.projectId, byStatus);
    }
    return map;
  }, [tasks]);

  const recent = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, RECENT_LIMIT),
    [projects],
  );

  if (recent.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Project</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recent.map((project) => {
          const counts = statusCounts(countsByProject.get(project.id) ?? new Map());
          const total = counts.reduce((sum, c) => sum + c.count, 0);
          const doneCount = counts.find((c) => c.status === 'done')?.count ?? 0;
          const legend = counts.filter((c) => c.count > 0);
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => setEditProject(project)}
              className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-xl border surface-glass-interactive p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ ['--proj-color' as string]: project.color }}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ backgroundImage: 'linear-gradient(to right, transparent, var(--proj-color), transparent)' }} />
              <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-40" style={{ background: 'var(--proj-color)' }} />
              <div className="flex items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="w-fit"><ProjectTag tag={project.tag} color={project.color} /></span>
                  <span className="line-clamp-1 text-sm font-semibold leading-snug">{project.name}</span>
                  {project.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p> : <p className="text-xs italic text-muted-foreground">No description</p>}
                </div>
                <StatusDonut counts={counts} total={total} />
              </div>
              {legend.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {legend.map((c) => (
                    <span key={c.status} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: `hsl(var(${c.hueVar}))` }} />
                      {c.label}<span className="tabular-nums text-foreground">{c.count}</span>
                    </span>
                  ))}
                </div>
              ) : <p className="text-[11px] text-muted-foreground">No tasks yet</p>}
              <ProjectProgressBar done={doneCount} total={total} hideLabel />
              <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                <span className="text-[11px] tabular-nums text-muted-foreground">Updated {relativeTime(project.updatedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
      {editProject && (
        <ProjectModal project={editProject} tasks={tasks.filter((t) => t.projectId === editProject.id)} onSelectTask={(task) => router.push(taskModalHref(task.id))} onClose={() => setEditProject(null)} onSaved={() => invalidateData()} />
      )}
    </section>
  );
}
