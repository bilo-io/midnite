'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Columns3, List, ListTree, type LucideIcon } from 'lucide-react';
import type { Project, Task } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { BoardView } from '@/components/board-view';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { ListView } from '@/components/list-view';
import { ProjectMultiSelect } from '@/components/project-multi-select';
import { TableView } from '@/components/table-view';
import { TaskThreadModal } from '@/components/task-thread-modal';
import { COLUMNS, COLUMN_STATUSES } from '@/components/task-columns';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: FilterOption[] = COLUMNS.map((c) => ({
  value: c.status,
  label: c.label,
  hue: `var(${c.hueVar})`,
}));

// Sentinel project-filter value for tasks with no project. A UUID can't collide.
const UNASSIGNED = 'none';

// View toggle, matching the Projects/Sessions control — list / board / table,
// persisted to localStorage. "board" is the kanban (where the others have grid).
type TaskView = 'list' | 'board' | 'table';
const VIEWS: readonly TaskView[] = ['list', 'board', 'table'];
const VIEW_STORAGE_KEY = 'midnite.tasks.view';
const VIEW_OPTIONS: Array<{ value: TaskView; label: string; Icon: LucideIcon }> = [
  { value: 'list', label: 'List view', Icon: List },
  { value: 'board', label: 'Board view', Icon: Columns3 },
  { value: 'table', label: 'Table view', Icon: ListTree },
];

/**
 * Owns the Tasks page chrome: the list/board/table toggle, the status and
 * project filters (backed by the URL query string), the project lookup and the
 * task detail modal. Delegates rendering to ListView, BoardView or TableView.
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
  const router = useRouter();
  const pathname = usePathname();

  // Deep-link target from the session modal's "Go to task": auto-open it once.
  const openId = searchParams.get('open');
  const handledOpenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || handledOpenRef.current === openId) return;
    const match = tasks.find((t) => t.id === openId);
    if (!match) return;
    handledOpenRef.current = openId;
    setSelected(match);
    // Strip the param so a manual close + refresh doesn't reopen it.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('open');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [openId, tasks, router, pathname, searchParams]);

  // The active view persists locally (like the other pages), not in the URL.
  const [view, setView] = useState<TaskView>('board');
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && (VIEWS as readonly string[]).includes(stored)) setView(stored as TaskView);
  }, []);
  const onSetView = useCallback((next: TaskView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

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

  // Project filter removes tasks not in the selected projects; the special
  // UNASSIGNED value matches tasks with no project.
  const validProjects = new Set([...projects.map((p) => p.id), UNASSIGNED]);
  const rawProject = searchParams.get('project');
  const activeProjects = new Set(
    (rawProject ? rawProject.split(',') : []).filter((p) => validProjects.has(p)),
  );
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filteredTasks = tasks
    .filter((t) => {
      if (activeProjects.size === 0) return true;
      if (t.projectId !== undefined && activeProjects.has(t.projectId)) return true;
      if (t.projectId === undefined && activeProjects.has(UNASSIGNED)) return true;
      return false;
    })
    .filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.repo ?? '').toLowerCase().includes(q) ||
        (t.kind ?? '').toLowerCase().includes(q),
    );

  const projectFilters: FilterOption[] = [
    { value: UNASSIGNED, label: 'Unassigned', color: '#94a3b8' },
    ...projects.map((p) => ({ value: p.id, label: p.tag, color: p.color })),
  ];

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
        <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
          {VIEW_OPTIONS.map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={label}
              aria-pressed={view === value}
              onClick={() => onSetView(value)}
              className={cn('h-7 w-7', view === value && 'bg-accent text-accent-foreground')}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Could not reach the gateway: {error}
        </div>
      )}

      {view === 'table' ? (
        <TableView {...viewProps} />
      ) : view === 'list' ? (
        <ListView {...viewProps} />
      ) : (
        <BoardView {...viewProps} />
      )}

      {selected ? (
        <TaskThreadModal
          task={selected}
          projects={projects}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
