'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, Status, Task } from '@midnite/shared';
import { ProjectModal } from '@/components/project-modal';
import { ProjectTag } from '@/components/project-tag';
import { SourceIcon } from '@/components/source-icon';
import { StatusDonut, statusCounts } from '@/components/status-donut';

export const RECENT_LIMIT = 3;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
}

export function ProjectCard({ project, tasks }: ProjectCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === project.id), [tasks, project.id]);

  const countsMap = useMemo(() => {
    const map = new Map<Status, number>();
    for (const t of projectTasks) map.set(t.status, (map.get(t.status) ?? 0) + 1);
    return map;
  }, [projectTasks]);

  const counts = statusCounts(countsMap);
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const legend = counts.filter((c) => c.count > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex h-full w-full flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ ['--proj-color' as string]: project.color }}
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
              <p className="text-xs italic text-muted-foreground/60">No description</p>
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
          <p className="text-[11px] text-muted-foreground/60">No tasks yet</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-2">
          {project.sources.length > 0 ? (
            <div className="flex items-center -space-x-1">
              {project.sources.slice(0, 5).map((s) => (
                <span key={s.id} className="flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background">
                  <SourceIcon kind={s.kind} faviconUrl={s.faviconUrl} className="h-3 w-3" />
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/60">No sources</span>
          )}
          <span className="text-[11px] tabular-nums text-muted-foreground">
            Updated {relativeTime(project.updatedAt)}
          </span>
        </div>
      </button>

      {open && (
        <ProjectModal
          project={project}
          tasks={projectTasks}
          onSelectTask={(task) => router.push(`/tasks?open=${task.id}`)}
          onClose={() => setOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}

export function RecentProjects({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
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
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent projects</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recent.map((project) => {
          const counts = statusCounts(countsByProject.get(project.id) ?? new Map());
          const total = counts.reduce((sum, c) => sum + c.count, 0);
          const legend = counts.filter((c) => c.count > 0);
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => setEditProject(project)}
              className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ ['--proj-color' as string]: project.color }}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ backgroundImage: 'linear-gradient(to right, transparent, var(--proj-color), transparent)' }} />
              <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-40" style={{ background: 'var(--proj-color)' }} />
              <div className="flex items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="w-fit"><ProjectTag tag={project.tag} color={project.color} /></span>
                  <span className="line-clamp-1 text-sm font-semibold leading-snug">{project.name}</span>
                  {project.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p> : <p className="text-xs italic text-muted-foreground/60">No description</p>}
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
              ) : <p className="text-[11px] text-muted-foreground/60">No tasks yet</p>}
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                {project.sources.length > 0 ? (
                  <div className="flex items-center -space-x-1">
                    {project.sources.slice(0, 5).map((s) => <span key={s.id} className="flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background"><SourceIcon kind={s.kind} faviconUrl={s.faviconUrl} className="h-3 w-3" /></span>)}
                  </div>
                ) : <span className="text-[11px] text-muted-foreground/60">No sources</span>}
                <span className="text-[11px] tabular-nums text-muted-foreground">Updated {relativeTime(project.updatedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
      {editProject && (
        <ProjectModal project={editProject} tasks={tasks.filter((t) => t.projectId === editProject.id)} onSelectTask={(task) => router.push(`/tasks?open=${task.id}`)} onClose={() => setEditProject(null)} onSaved={() => router.refresh()} />
      )}
    </section>
  );
}
