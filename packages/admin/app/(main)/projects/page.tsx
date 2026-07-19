'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectCompletion, type Project } from '@midnite/shared';
import { getProjects } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { ProgressBar } from '@/components/progress-bar';
import { ProjectDrawer } from '@/components/project-drawer';
import { LoadingRows, ErrorState, EmptyState } from '@/components/query-states';
import { formatInt } from '@/lib/format';

/**
 * Projects (Phase 73 Theme F). A read-focused registry: `GET /projects` lists
 * every project with its derived completion + task counts; clicking a row opens a
 * drill-in drawer backed by `GET /projects/:id`. Completion is derived from the
 * project's per-status counts via `projectCompletion` (shared) — never re-typed.
 */
export default function ProjectsPage() {
  const [selected, setSelected] = useState<Project | null>(null);

  const projects = useQuery({
    queryKey: ['admin', 'projects', 'list'],
    queryFn: ({ signal }) => getProjects(signal),
  });

  const rows = useMemo(
    () =>
      (projects.data?.items ?? []).filter((p) => !p.archived),
    [projects.data],
  );

  const columns: ReadonlyArray<Column<Project>> = [
    {
      key: 'name',
      header: 'Project',
      render: (p) => (
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-foreground">{p.name}</span>
            <span className="truncate font-mono text-xs text-muted-foreground">#{p.tag}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (p) => {
        const c = projectCompletion(p);
        return (
          <span className="flex w-40 flex-col gap-1">
            <ProgressBar pct={c.pct} />
            <span className="text-xs tabular-nums text-muted-foreground">
              {c.done}/{c.total} · {c.pct}%
            </span>
          </span>
        );
      },
    },
    {
      key: 'tasks',
      header: 'Tasks',
      className: 'text-right tabular-nums',
      render: (p) => formatInt(projectCompletion(p).total),
    },
    {
      key: 'repo',
      header: 'Work dir',
      render: (p) => (
        <span className="truncate font-mono text-xs text-muted-foreground">{p.workDir || '—'}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Projects"
        description="Every project on the platform — completion, task counts, and a per-project drill-in."
        actions={
          projects.data ? (
            <span className="text-sm text-muted-foreground">{formatInt(projects.data.total)} total</span>
          ) : null
        }
      />

      {projects.isPending ? (
        <LoadingRows count={8} />
      ) : projects.isError ? (
        <ErrorState error={projects.error} />
      ) : rows.length === 0 ? (
        <EmptyState>No active projects yet.</EmptyState>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} onRowClick={setSelected} />
      )}

      {selected ? <ProjectDrawer project={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
