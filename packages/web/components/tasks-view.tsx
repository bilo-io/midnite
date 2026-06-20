'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Columns3, List, ListTree, Plus, type LucideIcon } from 'lucide-react';
import type { Project, Status, Task } from '@midnite/shared';
import { deleteTask, startTask, stopTask, updateTaskStatus } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { Button } from '@/components/ui/button';
import { BoardView } from '@/components/board-view';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { useConfirm } from '@/components/confirm-dialog';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { ListView } from '@/components/list-view';
import { NewTaskModal } from '@/components/new-task-modal';
import { ProjectMultiSelect } from '@/components/project-multi-select';
import { TableView } from '@/components/table-view';
import { TaskThreadModal } from '@/components/task-thread-modal';
import { COLUMNS, COLUMN_STATUSES } from '@/components/task-columns';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

/** Bulk "Move to…" status menu shown in the selection toolbar. */
function MoveToMenu({ onMove }: { onMove: (status: Status) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        Move to
        <ChevronDown className="h-3 w-3" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-1 w-40 rounded-md border bg-popover p-1 shadow-md">
            {COLUMNS.map((c) => (
              <button
                key={c.status}
                type="button"
                onClick={() => {
                  onMove(c.status);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
              >
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: `hsl(var(${c.hueVar}))` }} />
                {c.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

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
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  // The page fetches tasks client-side, so the first render passes an empty
  // array (data still loading) and only later the real list. useState seeds
  // localTasks once, so without this sync the board would stay empty after the
  // fetch resolves. Local mutations (optimistic create) still apply on top.
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Surface a failed gateway fetch as a toast instead of an inline banner.
  useGatewayErrorToast(error);

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
  // Board drag-and-drop / Start / Stop: optimistically restatus, then call the
  // gateway. Dropping into "In progress" from todo/backlog spawns an agent session
  // (start endpoint); dragging a running task (wip/waiting) back to todo/backlog
  // stops it — interrupting the agent and idling its session (stop endpoint);
  // every other move is a plain status change. Rolls back and surfaces the error
  // (e.g. "no free agent slot") if the gateway rejects it.
  const onMove = useCallback(
    (taskId: string, target: Status) => {
      const current = localTasks.find((t) => t.id === taskId);
      if (!current || current.status === target) return;
      const prevStatus = current.status;
      const spawnsSession =
        target === 'wip' && (prevStatus === 'todo' || prevStatus === 'backlog');
      const stopsSession =
        (prevStatus === 'wip' || prevStatus === 'waiting') &&
        (target === 'todo' || target === 'backlog');
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: target } : t)),
      );
      void (async () => {
        try {
          if (spawnsSession) await startTask(taskId);
          else if (stopsSession) await stopTask(taskId, target as 'todo' | 'backlog');
          else await updateTaskStatus(taskId, target);
          invalidateData();
        } catch (e) {
          setLocalTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t)),
          );
          toast.error(e instanceof Error ? e.message : 'Failed to move task');
        }
      })();
    },
    [localTasks, toast],
  );

  const onSetView = useCallback((next: TaskView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  // --- Bulk selection (shared across all three views) ---
  const confirm = useConfirm();
  const {
    selectedIds,
    count: selectedCount,
    clear: clearSelection,
    isSelected,
    toggle: toggleSelect,
  } = useBulkSelection();

  const selectedTasks = useMemo(
    () => localTasks.filter((t) => selectedIds.includes(t.id)),
    [localTasks, selectedIds],
  );

  // Bulk move uses a plain restatus (no session spawn) — bulk-starting many
  // agents at once is never what's wanted. Optimistic, then reconcile.
  const applyStatus = useCallback(
    (ids: string[], status: Status) => {
      if (ids.length === 0) return;
      setLocalTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, status } : t)));
      clearSelection();
      void Promise.all(ids.map((id) => updateTaskStatus(id, status)))
        .then(invalidateData)
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : 'Failed to move tasks');
          invalidateData();
        });
    },
    [clearSelection, toast],
  );

  const deleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Delete ${ids.length} task${ids.length === 1 ? '' : 's'}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setLocalTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
    clearSelection();
    try {
      await Promise.all(ids.map((id) => deleteTask(id)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete tasks');
    }
    invalidateData();
  }, [selectedIds, confirm, clearSelection, toast]);

  const bulkActions = useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];
    const nonAbandoned = selectedTasks.filter((t) => t.status !== 'abandoned').map((t) => t.id);
    const abandoned = selectedTasks.filter((t) => t.status === 'abandoned').map((t) => t.id);
    if (nonAbandoned.length)
      actions.push({
        key: 'abandon',
        label: 'Abandon',
        color: BULK_COLORS.archive,
        onClick: () => applyStatus(nonAbandoned, 'abandoned'),
      });
    if (abandoned.length)
      actions.push({
        key: 'restore',
        label: 'Restore',
        color: BULK_COLORS.archive,
        onClick: () => applyStatus(abandoned, 'todo'),
      });
    actions.push({
      key: 'delete',
      label: 'Delete',
      color: BULK_COLORS.delete,
      onClick: () => void deleteSelected(),
    });
    return actions;
  }, [selectedTasks, applyStatus, deleteSelected]);

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
  // Tag filter: keep tasks carrying at least one of the selected tags. The
  // active set lives in the `tags` query param, so a filtered board is a
  // shareable/bookmarkable view — the "saved filter".
  const allTags = Array.from(new Set(localTasks.flatMap((t) => t.tags))).sort((a, b) =>
    a.localeCompare(b),
  );
  const rawTags = searchParams.get('tags');
  const activeTags = new Set((rawTags ? rawTags.split(',') : []).filter((t) => allTags.includes(t)));

  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filteredTasks = localTasks
    .filter((t) => {
      if (activeProjects.size === 0) return true;
      if (t.projectId !== undefined && activeProjects.has(t.projectId)) return true;
      if (t.projectId === undefined && activeProjects.has(UNASSIGNED)) return true;
      return false;
    })
    .filter((t) => activeTags.size === 0 || t.tags.some((tag) => activeTags.has(tag)))
    .filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.repo ?? '').toLowerCase().includes(q) ||
        (t.kind ?? '').toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );

  const projectFilters: FilterOption[] = [
    { value: UNASSIGNED, label: 'Unassigned', color: '#94a3b8' },
    ...projects.map((p) => ({ value: p.id, label: p.tag, color: p.color })),
  ];

  const tagFilters: FilterOption[] = allTags.map((tag) => ({ value: tag, label: tag }));

  const orderedIds = filteredTasks.map((t) => t.id);
  const viewProps = {
    tasks: filteredTasks,
    columns: visibleColumns,
    projectsById,
    onSelect: setSelected,
    showAbandoned: showAllStatuses,
    onMove,
    isSelected,
    onToggleSelect: (id: string, sk: boolean) => toggleSelect(id, sk, orderedIds),
  };

  return (
    <div className="reveal-staged container flex min-h-0 flex-1 flex-col gap-4 pb-4 pt-2">
      <div className="reveal-controls flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {projects.length > 0 && <ProjectMultiSelect options={projectFilters} />}
          <FilterPills options={STATUS_FILTERS} paramKey="status" />
          {tagFilters.length > 0 && <FilterPills options={tagFilters} paramKey="tags" />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
          <Button
            type="button"
            size="sm"
            onClick={() => setShowNewTask(true)}
            className="h-8 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New task
          </Button>
        </div>
      </div>

      <BulkActionBar
        count={selectedCount}
        actions={bulkActions}
        onClear={clearSelection}
        extra={
          selectedCount > 0 ? (
            <MoveToMenu onMove={(status) => applyStatus(selectedIds, status)} />
          ) : null
        }
      />

      <div className="reveal-content flex min-h-0 flex-1 flex-col">
        {view === 'table' ? (
          <TableView {...viewProps} />
        ) : view === 'list' ? (
          <ListView {...viewProps} />
        ) : (
          <BoardView {...viewProps} />
        )}
      </div>

      {selected ? (
        <TaskThreadModal
          task={selected}
          projects={projects}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {showNewTask && (
        <NewTaskModal
          projects={projects}
          onCreated={(task) => {
            setLocalTasks((prev) => [task, ...prev]);
            toast.success('Task created');
            // Reconcile with the server list and refresh counts/widgets.
            invalidateData();
          }}
          onClose={() => setShowNewTask(false)}
        />
      )}
    </div>
  );
}
