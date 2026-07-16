'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Columns3, List, ListTree, Plus, Workflow, type LucideIcon } from 'lucide-react';
import { type Project, type Repo, type Status, type Task, type TaskSummary } from '@midnite/shared';
import { deleteTask, getTask, reopenTask, updateTaskStatus } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { moveTask, spawnsSession } from '@/lib/task-transitions';
import { TASK_MODAL_PARAM, TASK_MODAL_LEGACY_PARAM } from '@/lib/task-route';
import {
  blockedCounts as computeBlockedCounts,
  unmetBlockerCount,
} from '@/lib/task-dependencies';
import { DELIVERY_STATES, matchesDelivery } from '@/lib/pr-delivery';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@midnite/ui';
import { BoardView } from '@/components/board-view';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { GuardrailsBanner, GuardrailsControl } from '@/components/guardrails-control';
import { useGuardrails } from '@/hooks/use-guardrails';
import { useConfirm } from '@/components/confirm-dialog';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { ListView } from '@/components/list-view';
import { NewTaskModal } from '@/components/new-task-modal';
import { ProjectMultiSelect } from '@/components/project-multi-select';
import { TableView } from '@/components/table-view';
import { WorkItemModal } from '@/components/work-item-modal';
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

// Single-toggle filter to surface inline-answered questions (Phase 15 Theme C),
// which resolve to Done and so are otherwise mixed in with completed work.
const ANSWERED_PARAM = 'answered';
const ANSWERED_VALUE = '1';
const ANSWERED_FILTERS: FilterOption[] = [
  { value: ANSWERED_VALUE, label: 'Answered', hue: 'var(--success)' },
];

// Delivery filter (Phase 22 Theme D): triage open PRs by what human action they
// await. Backed by the `delivery` query param, so a filtered board is shareable.
const DELIVERY_PARAM = 'delivery';
const DELIVERY_FILTERS: FilterOption[] = [
  { value: DELIVERY_STATES[0], label: 'Awaiting review', hue: '38 92% 50%' },
  { value: DELIVERY_STATES[1], label: 'Awaiting merge', hue: 'var(--success)' },
];

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
  repos,
}: {
  tasks: TaskSummary[];
  error: string | null;
  projects: Project[];
  repos: Repo[];
}) {
  const [localTasks, setLocalTasks] = useState<TaskSummary[]>(tasks);
  // The page fetches tasks client-side, so the first render passes an empty
  // array (data still loading) and only later the real list. useState seeds
  // localTasks once, so without this sync the board would stay empty after the
  // fetch resolves. Local mutations (optimistic create) still apply on top.
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);
  const [showNewTask, setShowNewTask] = useState(false);
  const { guardrails, setLocal: setGuardrails } = useGuardrails();
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Surface a failed gateway fetch as a toast instead of an inline banner.
  useGatewayErrorToast(error);

  // Allow the command palette's "Create task…" command to open the new-task form.
  useEffect(() => {
    const onNew = () => setShowNewTask(true);
    window.addEventListener('midnite:new-task', onNew);
    return () => window.removeEventListener('midnite:new-task', onNew);
  }, []);

  // Phase 42 B: the task detail modal is URL-driven (`?task=<id>`), so a card
  // click is a real navigation — the browser back button (or the modal's close)
  // pops it, and a refresh/share re-opens it. `selected` is derived from the
  // param, not local state, so it stays in sync once the board list loads.
  const openId = searchParams.get(TASK_MODAL_PARAM);
  // The board list is a lean TaskSummary[] (Phase 57 C); the detail modal needs
  // the full Task (events/prompt), so fetch it by id when the `?task=` param is set.
  const [selected, setSelected] = useState<Task | null>(null);
  useEffect(() => {
    if (!openId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    getTask(openId)
      .then((t) => {
        if (!cancelled) setSelected(t);
      })
      .catch(() => {
        if (!cancelled) setSelected(null);
      });
    return () => {
      cancelled = true;
    };
  }, [openId]);
  // Track whether the modal was opened by an in-app push (vs. a direct load /
  // legacy redirect): on close we `router.back()` for a push so history unwinds
  // cleanly, but strip the param for a direct load so we don't leave the app.
  const openedViaPushRef = useRef(false);

  const openTask = useCallback(
    (task: TaskSummary) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(TASK_MODAL_PARAM, task.id);
      openedViaPushRef.current = true;
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const closeTask = useCallback(() => {
    if (openedViaPushRef.current) {
      openedViaPushRef.current = false;
      router.back();
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete(TASK_MODAL_PARAM);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  // Legacy `?open=<id>` (older links / notifications) → canonical `?task=<id>`.
  // Kept for one release so existing bookmarks keep working.
  const legacyOpenId = searchParams.get(TASK_MODAL_LEGACY_PARAM);
  useEffect(() => {
    if (!legacyOpenId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete(TASK_MODAL_LEGACY_PARAM);
    params.set(TASK_MODAL_PARAM, legacyOpenId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [legacyOpenId, router, pathname, searchParams]);

  const confirm = useConfirm();

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
    async (taskId: string, target: Status) => {
      const current = localTasks.find((t) => t.id === taskId);
      if (!current || current.status === target) return;
      const prevStatus = current.status;
      // Manually starting a task whose blockers aren't done is a human override
      // (Phase 27) — warn + confirm before the optimistic restatus so a decline
      // leaves the board untouched.
      if (spawnsSession(prevStatus, target)) {
        const tasksById = new Map(localTasks.map((t) => [t.id, t] as const));
        const unmet = unmetBlockerCount(current, tasksById);
        if (unmet > 0) {
          const ok = await confirm({
            title: 'Start a blocked task?',
            description: `${unmet} blocker${unmet === 1 ? " isn't" : "s aren't"} done yet. The scheduler skips blocked tasks; starting it manually runs it anyway.`,
            confirmLabel: 'Start anyway',
          });
          if (!ok) return;
        }
      }
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: target } : t)),
      );
      try {
        await moveTask(prevStatus, target, taskId);
        invalidateData();
      } catch (e) {
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t)),
        );
        toast.error(e instanceof Error ? e.message : 'Failed to move task');
      }
    },
    [localTasks, toast, confirm],
  );

  // Reopen a terminal task (Phase 69 E). The board owns the confirm; here we
  // optimistically flip it to todo, hit the dedicated endpoint, and roll back on
  // failure — mirroring `onMove`, but reopen isn't a legal `ALLOWED_TRANSITIONS`
  // edge so it can't route through `moveTask`.
  const onReopen = useCallback(
    async (taskId: string) => {
      const current = localTasks.find((t) => t.id === taskId);
      if (!current) return;
      const prevStatus = current.status;
      setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'todo' } : t)));
      try {
        await reopenTask(taskId);
        invalidateData();
      } catch (e) {
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t)),
        );
        toast.error(e instanceof Error ? e.message : 'Failed to reopen task');
      }
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

  // "Answered" toggle: narrow to inline-answered questions (Phase 15 Theme C).
  const answeredOnly = searchParams.get(ANSWERED_PARAM) === ANSWERED_VALUE;

  // Delivery filter (Phase 22 Theme D): triage open PRs awaiting a human.
  const rawDelivery = searchParams.get(DELIVERY_PARAM);
  const activeDelivery = new Set(
    (rawDelivery ? rawDelivery.split(',') : []).filter((d) =>
      (DELIVERY_STATES as readonly string[]).includes(d),
    ),
  );

  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filteredTasks = localTasks
    .filter((t) => !answeredOnly || (t.answered ?? false))
    .filter((t) => {
      if (activeProjects.size === 0) return true;
      if (t.projectId !== undefined && activeProjects.has(t.projectId)) return true;
      if (t.projectId === undefined && activeProjects.has(UNASSIGNED)) return true;
      return false;
    })
    .filter((t) => activeTags.size === 0 || t.tags.some((tag) => activeTags.has(tag)))
    .filter((t) => matchesDelivery(t, activeDelivery))
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

  // Unmet-blocker count per task, computed over the full (unfiltered) list so a
  // blocker hidden by a status/project filter still counts toward "blocked".
  const blocked = useMemo(() => computeBlockedCounts(localTasks), [localTasks]);

  const orderedIds = filteredTasks.map((t) => t.id);
  const viewProps = {
    tasks: filteredTasks,
    columns: visibleColumns,
    projectsById,
    onSelect: openTask,
    showAbandoned: showAllStatuses,
    onMove,
    onReopen,
    isSelected,
    onToggleSelect: (id: string, sk: boolean) => toggleSelect(id, sk, orderedIds),
    blockedCounts: blocked,
  };

  return (
    <div className="reveal-staged container flex min-h-0 flex-1 flex-col gap-4 pb-4 pt-2">
      <div className="reveal-controls flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {projects.length > 0 && <ProjectMultiSelect options={projectFilters} />}
          <FilterPills options={STATUS_FILTERS} paramKey="status" allLabel="All statuses" />
          {tagFilters.length > 0 && (
            <FilterPills options={tagFilters} paramKey="tags" allLabel="All tags" />
          )}
          <FilterPills options={ANSWERED_FILTERS} paramKey={ANSWERED_PARAM} hideAll placeholder="Answered" />
          <FilterPills options={DELIVERY_FILTERS} paramKey={DELIVERY_PARAM} hideAll placeholder="Delivery" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <GuardrailsControl guardrails={guardrails} onChange={setGuardrails} />
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
          {/* Phase 58 B — the dependency DAG (read-only) for the current scope. */}
          <Link
            href="/tasks/graph"
            aria-label="View dependency graph"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 gap-1.5')}
          >
            <Workflow className="h-3.5 w-3.5" />
            Graph
          </Link>
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

      <GuardrailsBanner guardrails={guardrails} onChange={setGuardrails} />

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
        <WorkItemModal
          origin={{ kind: 'task', task: selected }}
          projects={projects}
          tasks={localTasks}
          onClose={closeTask}
        />
      ) : null}

      {showNewTask && (
        <NewTaskModal
          projects={projects}
          repos={repos}
          tasks={localTasks}
          onCreated={(task) => {
            setLocalTasks((prev) => [task, ...prev]);
            toast.success('Task created');
            // Reconcile with the server list and refresh counts/widgets.
            invalidateData();
          }}
          onBulkCreated={({ counts }) => {
            if (counts.created > 0) toast.success(`${counts.created} task${counts.created === 1 ? '' : 's'} created`);
            // The coalesced `tasks.bulkCreated` WS event also refreshes the board;
            // invalidate directly too so it updates without a live socket.
            invalidateData();
          }}
          onClose={() => setShowNewTask(false)}
        />
      )}
    </div>
  );
}
