'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown, Columns3, ListTree, Plus, Workflow, type LucideIcon } from 'lucide-react';
import { type Project, type Repo, type Status, type Task, type TaskSummary } from '@midnite/shared';
import { deleteTask, getTask, reopenTask, reorderTasks, updateTaskStatus } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { moveTask, spawnsSession } from '@/lib/task-transitions';
import { TASK_MODAL_PARAM, TASK_MODAL_LEGACY_PARAM } from '@/lib/task-route';
import {
  blockedCounts as computeBlockedCounts,
  unmetBlockerCount,
} from '@/lib/task-dependencies';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { CountPill } from '@/components/count-pill';
import { Button } from '@/components/ui/button';
import { BoardView } from '@/components/board-view';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { GuardrailsBanner, GuardrailsControl } from '@/components/guardrails-control';
import { useGuardrails } from '@/hooks/use-guardrails';
import { useConfirm } from '@/components/confirm-dialog';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { ListView } from '@/components/list-view';
import { NewTaskModal } from '@/components/new-task-modal';
import { ProjectMultiSelect } from '@/components/project-multi-select';
import { ProjectProgressBar } from '@/components/project-progress';
import { SearchBar } from '@/components/search-bar';
import { TaskGraphView } from '@/components/task-graph/task-graph-view';
import { WorkItemModal } from '@/components/work-item-modal';
import { COLUMNS, COLUMN_STATUSES } from '@/components/task-columns';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

/** Bulk "Move to…" status menu shown in the selection toolbar. */
function MoveToMenu({ onMove }: { onMove: (status: Status) => void }) {
  const t = useTranslations('board');
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        {t('bulk.moveTo')}
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
                {t(`columns.${c.status}`)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// Sentinel project-filter value for tasks with no project. A UUID can't collide.
const UNASSIGNED = 'none';

// Board layout style (only meaningful in board view): one shared board across all
// projects, or one collapsible board per project. Persisted locally like the view.
type BoardStyle = 'unified' | 'project';
const BOARD_STYLES: readonly BoardStyle[] = ['unified', 'project'];
const BOARD_STYLE_STORAGE_KEY = 'midnite.tasks.boardStyle';

// View toggle, matching the Projects/Sessions control — list / board / graph,
// persisted to localStorage. "board" is the kanban (where the others have
// grid); "graph" is the read-only dependency DAG (Phase 58 B), rendered
// in-page instead of the separate `/tasks/graph` route.
export type TaskView = 'list' | 'board' | 'graph';
const VIEWS: readonly TaskView[] = ['list', 'board', 'graph'];
const VIEW_STORAGE_KEY = 'midnite.tasks.view';
const VIEW_ICONS: Array<{ value: TaskView; Icon: LucideIcon }> = [
  { value: 'list', Icon: ListTree },
  { value: 'board', Icon: Columns3 },
  { value: 'graph', Icon: Workflow },
];

/**
 * Owns the Tasks page chrome: the list/board/graph toggle, the status and
 * project filters (backed by the URL query string), the project lookup and the
 * task detail modal. Delegates rendering to ListView, BoardView or TaskGraphView.
 */
export function TasksView({
  tasks,
  error,
  projects,
  repos,
  onViewChange,
}: {
  tasks: TaskSummary[];
  error: string | null;
  projects: Project[];
  repos: Repo[];
  /** Fires with the active view so the page shell can adapt (board is a
   *  bounded viewport-height layout; list/table flow with the document). */
  onViewChange?: (view: TaskView) => void;
}) {
  const t = useTranslations('board');
  const [localTasks, setLocalTasks] = useState<TaskSummary[]>(tasks);
  // The page fetches tasks client-side, so the first render passes an empty
  // array (data still loading) and only later the real list. useState seeds
  // localTasks once, so without this sync the board would stay empty after the
  // fetch resolves. Local mutations (optimistic create) still apply on top.
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);
  // The new-task modal, opened either bare (toolbar button / palette command) or
  // seeded from a column's "+" with a target status (and project, per-project mode).
  const [newTask, setNewTask] = useState<{ status?: Status; projectId?: string } | null>(null);
  const { guardrails, setLocal: setGuardrails } = useGuardrails();
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Surface a failed gateway fetch as a toast instead of an inline banner.
  useGatewayErrorToast(error);

  // Allow the command palette's "Create task…" command to open the new-task form.
  useEffect(() => {
    const onNew = () => setNewTask({});
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
  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  // Board layout style (unified vs. per-project accordions), persisted locally.
  const [boardStyle, setBoardStyleState] = useState<BoardStyle>('unified');
  useEffect(() => {
    const stored = localStorage.getItem(BOARD_STYLE_STORAGE_KEY);
    if (stored && (BOARD_STYLES as readonly string[]).includes(stored)) {
      setBoardStyleState(stored as BoardStyle);
    }
  }, []);
  const setBoardStyle = useCallback((next: BoardStyle) => {
    setBoardStyleState(next);
    try {
      localStorage.setItem(BOARD_STYLE_STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
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
            title: t('confirm.startBlockedTitle'),
            description: t('confirm.startBlockedDescription', { count: unmet }),
            confirmLabel: t('confirm.startBlockedConfirm'),
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
        toast.error(e instanceof Error ? e.message : t('toasts.moveFailed'));
      }
    },
    [localTasks, toast, confirm, t],
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
        toast.error(e instanceof Error ? e.message : t('toasts.reopenFailed'));
      }
    },
    [localTasks, toast, t],
  );

  // Vertical drag-reorder within a column (Phase — task reorder). `orderedIds` is
  // that column's task ids in their new top-to-bottom order. Optimistically permute
  // localTasks (the board regroups by status preserving array order, so the column
  // re-renders in the new order), then persist; roll back via a refetch on failure.
  // Display-only — the gateway keeps scheduling by priority + age.
  const onReorder = useCallback(
    (orderedIds: string[]) => {
      const idSet = new Set(orderedIds);
      setLocalTasks((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t] as const));
        const queue = orderedIds
          .map((id) => byId.get(id))
          .filter((t): t is TaskSummary => Boolean(t));
        let qi = 0;
        // Refill each reordered-column slot (in array order) with the next task from
        // the new order; tasks outside the column keep their positions.
        return prev.map((t) => (idSet.has(t.id) ? queue[qi++]! : t));
      });
      void reorderTasks(orderedIds)
        .then(invalidateData)
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : t('toasts.reorderFailed'));
          invalidateData(); // resync from the server order
        });
    },
    [toast, t],
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
          toast.error(e instanceof Error ? e.message : t('toasts.movesFailed'));
          invalidateData();
        });
    },
    [clearSelection, toast, t],
  );

  const deleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: t('confirm.deleteTasksTitle', { count: ids.length }),
      description: t('confirm.deleteTasksDescription'),
      confirmLabel: t('confirm.deleteTasksConfirm'),
    });
    if (!ok) return;
    setLocalTasks((prev) => prev.filter((task) => !ids.includes(task.id)));
    clearSelection();
    try {
      await Promise.all(ids.map((id) => deleteTask(id)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('toasts.deleteFailed'));
    }
    invalidateData();
  }, [selectedIds, confirm, clearSelection, toast, t]);

  const bulkActions = useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];
    const nonAbandoned = selectedTasks.filter((x) => x.status !== 'abandoned').map((x) => x.id);
    const abandoned = selectedTasks.filter((x) => x.status === 'abandoned').map((x) => x.id);
    if (nonAbandoned.length)
      actions.push({
        key: 'abandon',
        label: t('bulk.abandon'),
        color: BULK_COLORS.archive,
        onClick: () => applyStatus(nonAbandoned, 'abandoned'),
      });
    if (abandoned.length)
      actions.push({
        key: 'restore',
        label: t('bulk.restore'),
        color: BULK_COLORS.archive,
        onClick: () => applyStatus(abandoned, 'todo'),
      });
    actions.push({
      key: 'delete',
      label: t('bulk.delete'),
      color: BULK_COLORS.delete,
      onClick: () => void deleteSelected(),
    });
    return actions;
  }, [selectedTasks, applyStatus, deleteSelected, t]);

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
  // A single explicit project selection scopes the graph view and surfaces its
  // completion in the toolbar; "no project" or "several projects" don't map to
  // one dependency-graph scope, so both leave it unscoped (shows everything).
  const singleSelectedProjectId = activeProjects.size === 1 ? [...activeProjects][0] : undefined;
  const scopedProject =
    singleSelectedProjectId && singleSelectedProjectId !== UNASSIGNED
      ? projects.find((p) => p.id === singleSelectedProjectId)
      : undefined;
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
    { value: UNASSIGNED, label: t('unassigned'), color: '#94a3b8' },
    ...projects.map((p) => ({ value: p.id, label: p.tag, color: p.color })),
  ];

  const statusFilters: FilterOption[] = COLUMNS.map((c) => ({
    value: c.status,
    label: t(`columns.${c.status}`),
    hue: `var(${c.hueVar})`,
  }));

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
    onReorder,
    onReopen,
    isSelected,
    onToggleSelect: (id: string, sk: boolean) => toggleSelect(id, sk, orderedIds),
    blockedCounts: blocked,
  };

  return (
    <div
      className={cn(
        'reveal-staged container flex min-h-0 flex-1 flex-col pt-2',
        // The graph is a bounded, full-height canvas — sit it close under the
        // toolbar and let it run to the very bottom (no gap/padding to waste).
        // List/board flow with the document, so they keep the roomier spacing.
        view === 'graph' ? 'gap-2 pb-0' : 'gap-4 pb-4',
      )}
    >
      <StickyToolbar className="reveal-controls">
        <div className="flex flex-wrap items-center gap-2">
          <CountPill count={filteredTasks.length} className="mr-1" />
          {projects.length > 0 && <ProjectMultiSelect options={projectFilters} />}
          <FilterPills options={statusFilters} paramKey="status" allLabel={t('toolbar.allStatuses')} />
          {tagFilters.length > 0 && (
            <FilterPills options={tagFilters} paramKey="tags" allLabel={t('toolbar.allTags')} />
          )}
          {/* Board layout style — a shared board, or one collapsible board per
              project. Only meaningful in board view (list/table are flat). */}
          {view === 'board' ? (
            <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
              {BOARD_STYLES.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={boardStyle === value}
                  onClick={() => setBoardStyle(value)}
                  className={cn(
                    'h-7 px-2.5 text-xs',
                    boardStyle === value && 'bg-accent text-accent-foreground',
                  )}
                >
                  {t(`toolbar.boardStyles.${value}`)}
                </Button>
              ))}
            </div>
          ) : null}
          {/* A single project filter doubles as the graph view's scope — its
              completion reads here instead of a second bar inside the canvas. */}
          {scopedProject ? <ProjectProgressBar project={scopedProject} className="w-40" /> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <GuardrailsControl guardrails={guardrails} onChange={setGuardrails} />
          <SearchBar placeholder={t('toolbar.searchPlaceholder')} />
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            {VIEW_ICONS.map(({ value, Icon }) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t(`toolbar.views.${value}`)}
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
            onClick={() => setNewTask({})}
            className="h-8 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('toolbar.newTask')}
          </Button>
        </div>
      </StickyToolbar>

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
        {view === 'list' ? (
          <ListView {...viewProps} />
        ) : view === 'graph' ? (
          <TaskGraphView
            tasks={filteredTasks}
            projects={projects}
            showTaskModal={false}
            embedded
            projectId={scopedProject?.id}
          />
        ) : (
          <BoardView
            {...viewProps}
            groupByProject={boardStyle === 'project'}
            projects={projects}
            onAddTask={(status, projectId) => setNewTask({ status, projectId })}
          />
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

      {newTask && (
        <NewTaskModal
          projects={projects}
          repos={repos}
          tasks={localTasks}
          defaultStatus={newTask.status}
          defaultProjectId={newTask.projectId}
          onCreated={(task) => {
            setLocalTasks((prev) => [task, ...prev]);
            toast.success(t('toasts.taskCreated'));
            // Reconcile with the server list and refresh counts/widgets.
            invalidateData();
          }}
          onBulkCreated={({ counts }) => {
            if (counts.created > 0) toast.success(t('toasts.tasksCreated', { count: counts.created }));
            // The coalesced `tasks.bulkCreated` WS event also refreshes the board;
            // invalidate directly too so it updates without a live socket.
            invalidateData();
          }}
          onClose={() => setNewTask(null)}
        />
      )}
    </div>
  );
}
