'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Project, Task } from '@midnite/shared';
import { BoardView } from '@/components/board-view';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { ProjectMultiSelect } from '@/components/project-multi-select';
import { TableView } from '@/components/table-view';
import { TaskThreadModal } from '@/components/task-thread-modal';
import { ViewToggle } from '@/components/view-toggle';
import { COLUMNS, COLUMN_STATUSES } from '@/components/task-columns';

const STATUS_FILTERS: FilterOption[] = COLUMNS.map((c) => ({
  value: c.status,
  label: c.label,
  hue: `var(${c.hueVar})`,
}));

/**
 * Owns the Tasks page chrome: the board/table toggle, the status and project
 * filters (all backed by the URL query string), the project lookup and the
 * task detail modal. Delegates rendering to BoardView or TableView.
 */
export function TasksView({
  tasks,
  error,
  projects,
}: {
  tasks: Task[];
  error: string | null;
  projects: Project[];
}) {
  const [selected, setSelected] = useState<Task | null>(null);
  const searchParams = useSearchParams();

  const projectsById = new Map(
    projects.map((p) => [p.id, { tag: p.tag, color: p.color }] as const),
  );

  // Status filter narrows which columns/sections are shown.
  const rawStatus = searchParams.get('status');
  const activeStatuses = (rawStatus ? rawStatus.split(',') : []).filter((s) =>
    COLUMN_STATUSES.has(s),
  );
  const showAllStatuses = activeStatuses.length === 0;
  const statusSet = new Set(activeStatuses);
  const visibleColumns = showAllStatuses ? COLUMNS : COLUMNS.filter((c) => statusSet.has(c.status));

  // Project filter removes tasks not in the selected projects.
  const validProjects = new Set(projects.map((p) => p.id));
  const rawProject = searchParams.get('project');
  const activeProjects = new Set(
    (rawProject ? rawProject.split(',') : []).filter((p) => validProjects.has(p)),
  );
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filteredTasks = tasks
    .filter(
      (t) =>
        activeProjects.size === 0 ||
        (t.projectId !== undefined && activeProjects.has(t.projectId)),
    )
    .filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.repo ?? '').toLowerCase().includes(q) ||
        (t.kind ?? '').toLowerCase().includes(q),
    );

  const projectFilters: FilterOption[] = projects.map((p) => ({
    value: p.id,
    label: p.tag,
    color: p.color,
  }));

  const view = searchParams.get('view') === 'table' ? 'table' : 'board';
  const viewProps = {
    tasks: filteredTasks,
    columns: visibleColumns,
    projectsById,
    onSelect: setSelected,
    showAbandoned: showAllStatuses,
  };

  return (
    <div className="container flex min-h-0 flex-1 flex-col gap-4 pb-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {projects.length > 0 && <ProjectMultiSelect options={projectFilters} />}
          <FilterPills options={STATUS_FILTERS} paramKey="status" />
        </div>
        <ViewToggle />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Could not reach the gateway: {error}
        </div>
      )}

      {view === 'table' ? <TableView {...viewProps} /> : <BoardView {...viewProps} />}

      {selected ? (
        <TaskThreadModal task={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
