'use client';

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import { ChevronsLeft, ChevronsRight, Play, Plus, RotateCcw, Square } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Project, Status, TaskSummary } from '@midnite/shared';
import { AbandonedRow } from '@/components/abandoned-row';
import { useConfirm } from '@/components/confirm-dialog';
import { ProjectTag } from '@/components/project-tag';
import { SelectableIcon } from '@/components/selectable-icon';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { TapToMoveMenu } from '@/components/tap-to-move-menu';
import { TaskCard, type ProjectTagInfo } from '@/components/task-card';
import { type ColumnDef, type TaskViewProps, groupByStatus } from '@/components/task-columns';
import { arrowDir, nextFocusId, type FocusGrid } from '@/lib/board-nav';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

/** The only statuses a brand-new task can take — a card can't be *created*
 *  directly into In-progress/Waiting/Done (those follow the agent session), so
 *  the per-column "+" affordance only appears on these. */
const CREATABLE_STATUSES = new Set<Status>(['backlog', 'todo']);

/** The two end columns can be collapsed to a slim rail — they sit at either edge
 *  of the board and tend to accumulate the most cards (a long backlog, an
 *  ever-growing done pile), so hiding them reclaims room for the active middle.
 *  `side` picks which way the collapse/expand chevrons point (outward when
 *  collapsing, inward when expanding). Only these statuses are collapsible. */
const COLLAPSIBLE_STATUSES = new Map<Status, 'left' | 'right'>([
  ['backlog', 'left'],
  ['done', 'right'],
]);
const COLLAPSED_STORAGE_KEY = 'midnite.tasks.collapsedColumns';

/**
 * The set of collapsed end columns, persisted to localStorage. A single shared
 * preference across both board styles: collapsing "Done" hides it in the unified
 * board *and* in every per-project accordion. Only the two collapsible statuses
 * are ever stored (a stale/foreign value is filtered out on load).
 */
function useCollapsedColumns(): { collapsed: Set<Status>; toggle: (status: Status) => void } {
  const [collapsed, setCollapsed] = useState<Set<Status>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setCollapsed(
          new Set(parsed.filter((s): s is Status => COLLAPSIBLE_STATUSES.has(s as Status))),
        );
      }
    } catch {
      // ignore malformed / unavailable storage (private mode, etc.)
    }
  }, []);
  const toggle = useCallback((status: Status) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }, []);
  return { collapsed, toggle };
}

/**
 * Resolve a board drag-end into one of two intents, shared by the unified and
 * per-project boards:
 *  - dropped over another column (or a card in one) → a **status move** (`onMove`),
 *    which may spawn/stop a session — the existing cross-column behaviour.
 *  - dropped within the same column → a **reorder** (`onReorder`) of that column's
 *    ids, persisted as the manual board order (display-only).
 * `over.id` is either a column's status (its droppable) or a card's task id.
 */
function resolveBoardDragEnd(
  event: DragEndEvent,
  tasks: TaskSummary[],
  columns: ColumnDef[],
  onMove?: (taskId: string, target: Status) => void,
  onReorder?: (orderedIds: string[]) => void,
): void {
  const { active, over } = event;
  if (!over) return;
  const activeId = String(active.id);
  const overId = String(over.id);
  const activeTask = tasks.find((t) => t.id === activeId);
  if (!activeTask) return;

  const statuses = new Set<string>(columns.map((c) => c.status));
  const overTask = tasks.find((t) => t.id === overId);
  // Target column: the over id is a column status (dropped on the column itself)
  // or a card whose status names the column.
  const targetStatus = (statuses.has(overId) ? (overId as Status) : overTask?.status) ?? undefined;
  if (!targetStatus) return;

  if (targetStatus !== activeTask.status) {
    onMove?.(activeId, targetStatus);
    return;
  }

  // Same column → reorder. Build the column's id list and move the active card to
  // the drop target's slot (end of the column when dropped on empty space).
  if (!onReorder || activeId === overId) return;
  const colIds = tasks.filter((t) => t.status === targetStatus).map((t) => t.id);
  const from = colIds.indexOf(activeId);
  const to = overTask ? colIds.indexOf(overId) : colIds.length - 1;
  if (from === -1 || to === -1 || from === to) return;
  onReorder(arrayMove(colIds, from, to));
}

/** True when focus sits in an editable element — board shortcuts are suppressed then. */
function inEditableElement(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.contentEditable === 'true';
}

/**
 * True when a *visible* modal is open, so its own focus trap / keys own the
 * keyboard. Some dialogs (the mobile nav menu) stay mounted but hidden — those
 * have no client rects, so a presence check alone would wrongly suppress the
 * board on desktop. Gate on actual visibility instead.
 */
function visibleModalOpen(): boolean {
  for (const d of document.querySelectorAll<HTMLElement>('[role="dialog"]')) {
    if (d.getClientRects().length > 0) return true;
  }
  return false;
}

/**
 * Kanban layout for the Tasks page: one column per visible status. On desktop,
 * columns scroll horizontally; on mobile (< md), columns snap-scroll one at a
 * time with a tab bar so you always see the active column clearly.
 *
 * Cards drag between columns via dnd-kit; on touch, a tap-to-move fallback menu
 * supersedes the finicky hold-drag (Phase 24 Theme B).
 */
type BoardViewProps = TaskViewProps & {
  /** Per-project accordions (each its own board) instead of one shared board. */
  groupByProject?: boolean;
  /** The project list — supplies tag/colour/order for the per-project accordions. */
  projects?: Project[];
  /** Open the new-task modal seeded for a column (and project, in per-project mode). */
  onAddTask?: (status: Status, projectId?: string) => void;
};

/**
 * Dispatcher: the unified single board ("All in one") or the per-project
 * accordions ("Per project"). Split so each keeps its own hooks — the unified
 * board's keyboard-nav / mobile-snap machinery never runs in per-project mode.
 */
export function BoardView({ groupByProject = false, projects = [], ...props }: BoardViewProps) {
  if (groupByProject) return <ProjectBoardsView {...props} projects={projects} />;
  return <UnifiedBoard {...props} />;
}

function UnifiedBoard({
  tasks,
  columns,
  projectsById,
  onSelect,
  showAbandoned,
  onMove,
  onReorder,
  onReopen,
  isSelected,
  onToggleSelect,
  blockedCounts,
  onAddTask,
}: TaskViewProps & { onAddTask?: (status: Status, projectId?: string) => void }) {
  const grouped = groupByStatus(tasks);

  // The id of the card currently being dragged, so it can be rendered in the
  // DragOverlay (a document-level portal that escapes column overflow clipping).
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  // The DragOverlay is portaled to <body> so the page-reveal entrance transform
  // on an ancestor can't become its containing block and offset it from the
  // cursor. document is undefined during static-export SSR, so gate on mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isMobile = useIsMobile();
  const t = useTranslations('board');

  // Collapsed end columns (Backlog / Done). Persisted locally like the view +
  // board-style prefs. Collapse is a desktop affordance only: on mobile the board
  // snap-scrolls one full-width column at a time (the tab bar above), so a slim
  // rail has nowhere to live — `isMobile` gates it off at render time.
  const { collapsed: collapsedCols, toggle: toggleCollapse } = useCollapsedColumns();

  // Split mouse vs. touch so each gets the right activation (Phase 24 Theme B):
  // - Mouse: a 6px distance — a plain click still reaches the card button (open
  //   the modal) while a deliberate drag starts after the pointer moves.
  // - Touch: a press-and-hold delay so a *plain swipe scrolls* the board and only
  //   a held press starts a drag. The tap-to-move menu is the guaranteed fallback.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    // A pointer drag takes over — drop the keyboard focus ring so it doesn't
    // linger on a card the user is no longer driving with the keyboard.
    clearFocus();
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    resolveBoardDragEnd(event, tasks, columns, onMove, onReorder);
  };

  // Mobile snap-scroll: track which column is currently visible via scrollLeft.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeColIdx, setActiveColIdx] = useState(0);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveColIdx(Math.round(el.scrollLeft / el.clientWidth));
  }

  function scrollToColumn(idx: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  }

  // --- Keyboard navigation (Phase 41 Theme D) ---
  // A single focused card (id only; its column is derived from the live grouping
  // so a focused card stays focused as it moves). Arrow keys walk the visible grid;
  // Enter opens detail; D marks done; A abandons. All suppressed inside inputs or
  // while a modal/dialog is open (its own focus trap owns the keys then).
  const confirm = useConfirm();
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Reopen a terminal task (Phase 69 E). Not a status move — done/abandoned have
  // no legal `onMove` edge — so the board confirms (it clears the session +
  // re-blocks dependents), then delegates the mutation to the `onReopen` prop.
  const handleReopen = useCallback(
    async (id: string) => {
      if (!onReopen) return;
      const ok = await confirm({
        title: t('confirm.reopenTitle'),
        description: t('confirm.reopenDescription'),
        confirmLabel: t('confirm.reopenConfirm'),
        destructive: false,
      });
      if (!ok) return;
      await onReopen(id);
    },
    [confirm, onReopen, t],
  );

  // The visible grid, in render order, rebuilt each render from the same grouping
  // the columns use — so navigation always matches what's on screen. A collapsed
  // column contributes no cards (they aren't rendered), so arrow-nav skips it.
  const grid: FocusGrid = columns.map((col) =>
    !isMobile && collapsedCols.has(col.status)
      ? []
      : (grouped.get(col.status) ?? []).map((t) => t.id),
  );

  // Keep a ref to the latest grid + handlers so the keydown effect can stay
  // subscribed once without re-binding on every task/grouping change.
  const navRef = useRef({ grid, focusedId, tasks, onSelect, onMove, confirm, t });
  navRef.current = { grid, focusedId, tasks, onSelect, onMove, confirm, t };

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      // Don't fight inputs or a modal's own focus-trapped keys.
      if (inEditableElement()) return;
      if (visibleModalOpen()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const { grid, focusedId, tasks, onSelect, onMove, confirm, t } = navRef.current;

      const dir = arrowDir(e.key);
      if (dir) {
        const next = nextFocusId(grid, focusedId, dir);
        if (next) {
          e.preventDefault();
          setFocusedId(next);
        }
        return;
      }

      // The action keys below all target the focused card.
      const task = focusedId ? tasks.find((t) => t.id === focusedId) : undefined;
      if (!task) return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          onSelect(task);
          break;
        case 'd':
        case 'D': {
          e.preventDefault();
          // A normal move to done is immediate; re-confirming an already-done card
          // guards the odd no-op the phase doc calls out.
          if (task.status === 'done') {
            const ok = await confirm({
              title: t('confirm.doneAgainTitle'),
              description: t('confirm.doneAgainDescription'),
              confirmLabel: t('confirm.doneAgainConfirm'),
              destructive: false,
            });
            if (!ok) return;
          }
          onMove?.(task.id, 'done');
          break;
        }
        case 'a':
        case 'A': {
          e.preventDefault();
          const ok = await confirm({
            title: t('confirm.abandonTitle'),
            description: t('confirm.abandonDescription'),
            confirmLabel: t('confirm.abandonConfirm'),
          });
          if (ok) onMove?.(task.id, 'abandoned');
          break;
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clearFocus = useCallback(() => setFocusedId(null), []);

  return (
    <div className="flex flex-1 flex-col">
      {/* Mobile column tab bar — hidden on md+ */}
      <div className="flex border-b border-border/60 md:hidden">
        {columns.map((col, idx) => {
          const count = (grouped.get(col.status) ?? []).length;
          const active = activeColIdx === idx;
          return (
            <button
              key={col.status}
              type="button"
              onClick={() => scrollToColumn(idx)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-medium transition-colors',
                active ? 'text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              style={
                active
                  ? { borderColor: `hsl(var(${col.hueVar}))`, color: `hsl(var(${col.hueVar}))` }
                  : undefined
              }
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: `hsl(var(${col.hueVar}))` }}
              />
              {t(`columns.${col.status}`)}
              <span className="rounded-full bg-muted/70 px-1.5 py-px tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {/*
         * Desktop (md+): a plain flex row — columns grow to their content height and
         * the whole PAGE scrolls, so a full board reads as a tall page (no per-column
         * scroll). `items-start` keeps each column at its natural height; `overflow-visible`
         * means this row is not a scroll container, so vertical content flows to the document.
         * Mobile: snap-scroll — each column fills the viewport width; swipe left/right to
         * page between columns. No gap between columns on mobile (inner padding used).
         */}
        <div
          ref={scrollRef}
          onScroll={isMobile ? handleScroll : undefined}
          // Focusable so keyboard users can scroll the board even when a column has
          // no focusable cards (axe `scrollable-region-focusable`).
          tabIndex={0}
          role="group"
          aria-label={t('title')}
          data-tour="board"
          className="flex gap-3 overflow-x-auto pb-1 max-md:snap-x max-md:snap-mandatory max-md:scroll-smooth max-md:gap-0 md:items-start md:overflow-x-visible"
        >
          {columns.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              label={t(`columns.${col.status}`)}
              hueVar={col.hueVar}
              count={(grouped.get(col.status) ?? []).length}
              // Collapse is desktop-only (see `collapsedCols`); on mobile every
              // column renders full-width in the snap scroller.
              side={COLLAPSIBLE_STATUSES.get(col.status)}
              collapsed={!isMobile && collapsedCols.has(col.status)}
              onToggleCollapse={
                !isMobile && COLLAPSIBLE_STATUSES.has(col.status)
                  ? () => toggleCollapse(col.status)
                  : undefined
              }
              onAdd={
                onAddTask && CREATABLE_STATUSES.has(col.status)
                  ? () => onAddTask(col.status)
                  : undefined
              }
            >
              {/* Plain, un-windowed list: every card renders so the column grows to
                  its full height and the page scrolls. Boards hold tens–hundreds of
                  cards, well within a comfortable DOM budget. A SortableContext lets
                  cards be dragged to reorder vertically within the column. */}
              <SortableContext
                items={(grouped.get(col.status) ?? []).map((tk) => tk.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {(grouped.get(col.status) ?? []).map((t) => (
                    <DraggableCard
                      key={t.id}
                      task={t}
                      project={t.projectId ? projectsById.get(t.projectId) : undefined}
                      onSelect={() => onSelect(t)}
                      onStart={onMove ? () => onMove(t.id, 'wip') : undefined}
                      onStop={onMove ? () => onMove(t.id, 'todo') : undefined}
                      onReopen={onReopen ? () => void handleReopen(t.id) : undefined}
                      selected={isSelected?.(t.id) ?? false}
                      onToggleSelect={onToggleSelect ? (sk) => onToggleSelect(t.id, sk) : undefined}
                      blockedBy={blockedCounts?.get(t.id)}
                      focused={t.id === focusedId}
                      // On a phone, drag is finicky — offer the tap-to-move fallback.
                      moveColumns={isMobile && onMove ? columns : undefined}
                      onMoveTo={onMove ? (target) => onMove(t.id, target) : undefined}
                    />
                  ))}
                </div>
              </SortableContext>
            </Column>
          ))}
        </div>

        {showAbandoned && (
          <AbandonedRow
            tasks={grouped.get('abandoned') ?? []}
            onSelect={onSelect}
            projectsById={projectsById}
            blockedCounts={blockedCounts}
            onReopen={onReopen ? (id) => void handleReopen(id) : undefined}
          />
        )}

        {mounted &&
          createPortal(
            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <div className="rotate-2 cursor-grabbing opacity-90 shadow-2xl">
                  <TaskCard
                    task={activeTask}
                    project={
                      activeTask.projectId ? projectsById.get(activeTask.projectId) : undefined
                    }
                    onSelect={() => {}}
                    blockedBy={blockedCounts?.get(activeTask.id)}
                  />
                </div>
              ) : null}
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </div>
  );
}

type ProjectGroup = {
  key: string;
  /** The real project id (undefined for the synthetic "Unassigned" group). */
  projectId?: string;
  name: string;
  tag?: string;
  color?: string;
  tasks: TaskSummary[];
};

/** Partition tasks into per-project groups (in the project list's order), with an
 *  "Unassigned" group last. Only groups that actually hold tasks are returned. */
function groupTasksByProject(
  tasks: TaskSummary[],
  projects: Project[],
  unassignedLabel: string,
): ProjectGroup[] {
  const byId = new Map<string, TaskSummary[]>();
  const unassigned: TaskSummary[] = [];
  for (const t of tasks) {
    if (t.projectId) {
      const list = byId.get(t.projectId) ?? [];
      list.push(t);
      byId.set(t.projectId, list);
    } else {
      unassigned.push(t);
    }
  }
  const groups: ProjectGroup[] = [];
  for (const p of projects) {
    const list = byId.get(p.id);
    if (list && list.length > 0)
      groups.push({ key: p.id, projectId: p.id, name: p.name, tag: p.tag, color: p.color, tasks: list });
  }
  if (unassigned.length > 0) {
    groups.push({ key: '__unassigned__', name: unassignedLabel, color: '#94a3b8', tasks: unassigned });
  }
  return groups;
}

/**
 * "Per project" board: one collapsible board per project, each with the same
 * status columns as the unified board. The sections are drag-reorderable and
 * their order + collapsed state persist in localStorage (via SortableAccordions,
 * shared with the Projects tree / Table view). The project tag chip sits at the
 * far right of each section header. Every project board is an independent
 * DndContext, so status drag works *within* a project (moving to another
 * project's column isn't offered — that would reassign the project). The heavier
 * unified-board machinery (keyboard nav, mobile snap) is intentionally omitted
 * here; this mode is an overview.
 */
function ProjectBoardsView({
  tasks,
  columns,
  projectsById,
  onSelect,
  onMove,
  onReorder,
  onReopen,
  isSelected,
  onToggleSelect,
  blockedCounts,
  showAbandoned,
  projects,
  onAddTask,
}: TaskViewProps & {
  projects: Project[];
  onAddTask?: (status: Status, projectId?: string) => void;
}) {
  const t = useTranslations('board');
  const confirm = useConfirm();
  const isMobile = useIsMobile();
  // One shared collapse preference across every project accordion (and the
  // unified board) — collapsing "Done" hides it in all of them at once.
  const { collapsed: collapsedCols, toggle: toggleCollapse } = useCollapsedColumns();
  const groups = useMemo(
    () => groupTasksByProject(tasks, projects, t('unassigned')),
    [tasks, projects, t],
  );
  const abandoned = useMemo(() => tasks.filter((x) => x.status === 'abandoned'), [tasks]);

  const handleReopen = useCallback(
    async (id: string) => {
      if (!onReopen) return;
      const ok = await confirm({
        title: t('confirm.reopenTitle'),
        description: t('confirm.reopenDescription'),
        confirmLabel: t('confirm.reopenConfirm'),
        destructive: false,
      });
      if (!ok) return;
      await onReopen(id);
    },
    [confirm, onReopen, t],
  );

  const sections: AccordionSection[] = groups.map((g) => ({
    id: g.key,
    label: g.name,
    color: g.color,
    count: g.tasks.length,
    // The count pill carries the total; a gradient progress bar beside it tracks
    // completion (done tasks / total), so no duplicate "N tasks" summary text.
    summary: '',
    progress: { done: g.tasks.filter((x) => x.status === 'done').length, total: g.tasks.length },
    // Requirement: the project tag chip lives at the far right of the header.
    actions: g.tag ? <ProjectTag tag={g.tag} color={g.color ?? '#94a3b8'} /> : undefined,
    body: (
      <ProjectBoardBody
        projectKey={g.projectId}
        tasks={g.tasks}
        columns={columns}
        projectsById={projectsById}
        onSelect={onSelect}
        onMove={onMove}
        onReorder={onReorder}
        onReopen={onReopen ? handleReopen : undefined}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        blockedCounts={blockedCounts}
        isMobile={isMobile}
        collapsedCols={collapsedCols}
        onToggleCollapse={toggleCollapse}
        onAddTask={onAddTask}
      />
    ),
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      {groups.length === 0 ? (
        <p className="px-1 py-8 text-center text-sm text-muted-foreground">{t('nothingHere')}</p>
      ) : (
        <SortableAccordions sections={sections} storageKey="midnite.tasks.projectBoards" variant="bare" />
      )}
      {showAbandoned ? (
        <AbandonedRow
          tasks={abandoned}
          onSelect={onSelect}
          projectsById={projectsById}
          blockedCounts={blockedCounts}
          onReopen={onReopen ? (id) => void handleReopen(id) : undefined}
        />
      ) : null}
    </div>
  );
}

/**
 * The board that fills a per-project accordion's body: the status columns for one
 * project, in an independent DndContext. The section chrome (header, drag handle,
 * collapse) is provided by SortableAccordions — this renders only the board.
 */
function ProjectBoardBody({
  projectKey,
  tasks,
  columns,
  projectsById,
  onSelect,
  onMove,
  onReorder,
  onReopen,
  isSelected,
  onToggleSelect,
  blockedCounts,
  isMobile,
  collapsedCols,
  onToggleCollapse,
  onAddTask,
}: {
  /** The project id to seed a new task with (undefined for the Unassigned group). */
  projectKey?: string;
  tasks: TaskSummary[];
  columns: ColumnDef[];
  projectsById: Map<string, ProjectTagInfo>;
  onSelect: (task: TaskSummary) => void;
  onMove?: (taskId: string, target: Status) => void;
  onReorder?: (orderedIds: string[]) => void;
  onReopen?: (id: string) => void | Promise<void>;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
  blockedCounts?: Map<string, number>;
  isMobile: boolean;
  /** Shared collapsed-column set + toggle (desktop-only; see `useCollapsedColumns`). */
  collapsedCols: Set<Status>;
  onToggleCollapse: (status: Status) => void;
  onAddTask?: (status: Status, projectId?: string) => void;
}) {
  const t = useTranslations('board');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );
  const grouped = groupByStatus(tasks);
  const activeTask = activeId ? tasks.find((x) => x.id === activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={(e) => {
        setActiveId(null);
        resolveBoardDragEnd(e, tasks, columns, onMove, onReorder);
      }}
      onDragCancel={() => setActiveId(null)}
    >
      {/* Columns grow to content; the row scrolls horizontally only if the
          columns overflow (vertical growth flows to the page). The section chrome
          is now "bare" (no card), so the columns sit flush under the header. */}
      <div className="flex flex-col gap-3 overflow-x-auto pt-1 md:flex-row md:items-start">
        {columns.map((col) => {
          const colTasks = grouped.get(col.status) ?? [];
          return (
            <Column
              key={col.status}
              status={col.status}
              label={t(`columns.${col.status}`)}
              hueVar={col.hueVar}
              count={colTasks.length}
              // Collapse is desktop-only; on mobile the per-project board stacks
              // its columns full-width, where a slim rail has no place.
              side={COLLAPSIBLE_STATUSES.get(col.status)}
              collapsed={!isMobile && collapsedCols.has(col.status)}
              onToggleCollapse={
                !isMobile && COLLAPSIBLE_STATUSES.has(col.status)
                  ? () => onToggleCollapse(col.status)
                  : undefined
              }
              onAdd={
                onAddTask && CREATABLE_STATUSES.has(col.status)
                  ? () => onAddTask(col.status, projectKey)
                  : undefined
              }
            >
              <SortableContext
                items={colTasks.map((tk) => tk.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {colTasks.map((tk) => (
                    <DraggableCard
                      key={tk.id}
                      task={tk}
                      project={tk.projectId ? projectsById.get(tk.projectId) : undefined}
                      onSelect={() => onSelect(tk)}
                      onStart={onMove ? () => onMove(tk.id, 'wip') : undefined}
                      onStop={onMove ? () => onMove(tk.id, 'todo') : undefined}
                      onReopen={onReopen ? () => void onReopen(tk.id) : undefined}
                      selected={isSelected?.(tk.id) ?? false}
                      onToggleSelect={onToggleSelect ? (sk) => onToggleSelect(tk.id, sk) : undefined}
                      blockedBy={blockedCounts?.get(tk.id)}
                      moveColumns={isMobile && onMove ? columns : undefined}
                      onMoveTo={onMove ? (target) => onMove(tk.id, target) : undefined}
                    />
                  ))}
                </div>
              </SortableContext>
            </Column>
          );
        })}
      </div>
      {mounted &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="rotate-2 cursor-grabbing opacity-90 shadow-2xl">
                <TaskCard
                  task={activeTask}
                  project={activeTask.projectId ? projectsById.get(activeTask.projectId) : undefined}
                  onSelect={() => {}}
                  blockedBy={blockedCounts?.get(activeTask.id)}
                />
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

function Column({
  status,
  label,
  hueVar,
  count,
  onAdd,
  side,
  collapsed = false,
  onToggleCollapse,
  children,
}: {
  status: Status;
  label: string;
  hueVar: string;
  count: number;
  /** When set, a "+" button in the header opens the new-task modal for this column. */
  onAdd?: () => void;
  /** Which board edge this column sits on — orients the collapse/expand chevrons.
   *  Only set for the collapsible end columns (Backlog = left, Done = right). */
  side?: 'left' | 'right';
  /** Rendered as a slim vertical rail when true. */
  collapsed?: boolean;
  /** When set, the column is collapsible: a header chevron collapses it and the
   *  whole rail expands it back. Undefined ⇒ not collapsible (no affordance). */
  onToggleCollapse?: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const t = useTranslations('board');

  // Collapsed: a slim rail that still accepts drops (the droppable ref stays wired),
  // showing only the accent, an expand chevron, the count, and the vertical label.
  // The whole rail is the expand target (click / Enter / Space).
  if (collapsed && onToggleCollapse) {
    // Chevron points inward (toward the board's centre) to signal "expand".
    const ExpandIcon = side === 'right' ? ChevronsLeft : ChevronsRight;
    return (
      <button
        type="button"
        ref={setNodeRef}
        data-tour={`board-column-${status}`}
        aria-expanded={false}
        aria-label={t('expandColumn', { column: label })}
        title={t('expandColumn', { column: label })}
        onClick={onToggleCollapse}
        className={cn(
          'group/rail relative flex w-11 shrink-0 grow-0 cursor-pointer flex-col items-center gap-2 rounded-lg border surface-glass py-3 transition-colors hover:bg-card/80',
          isOver && 'border-foreground/30 bg-card/90 ring-1 ring-foreground/20',
        )}
        style={{ ['--col-hue' as string]: `var(${hueVar})` }}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            backgroundImage:
              'linear-gradient(to right, transparent, hsl(var(--col-hue) / 0.7), transparent)',
          }}
        />
        <ExpandIcon className="h-4 w-4 text-muted-foreground transition-colors group-hover/rail:text-foreground" />
        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            background: 'hsl(var(--col-hue))',
            boxShadow: '0 0 8px -1px hsl(var(--col-hue) / 0.7)',
          }}
        />
        {/* Vertical label fills the rest of the rail (reads top-to-bottom). */}
        <span className="mt-1 select-none text-xs font-medium uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl]">
          {label}
        </span>
      </button>
    );
  }

  const CollapseIcon = side === 'right' ? ChevronsRight : ChevronsLeft;
  return (
    <section
      ref={setNodeRef}
      data-tour={`board-column-${status}`}
      className={cn(
        // Desktop: equal-width columns that grow to their content height (the page,
        // not the column, scrolls). `self-start` via the row's items-start keeps each
        // at its natural height.
        'relative flex min-w-[240px] flex-1 flex-col rounded-lg border surface-glass p-3 transition-colors',
        // Mobile: each column is exactly the viewport width (fills the snap container).
        // No side borders on mobile — the tab bar above provides the column affordance.
        'max-md:w-full max-md:min-w-0 max-md:shrink-0 max-md:snap-start max-md:rounded-none max-md:border-x-0',
        isOver && 'border-foreground/30 bg-card/90 ring-1 ring-foreground/20',
      )}
      style={{ ['--col-hue' as string]: `var(${hueVar})` }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          backgroundImage:
            'linear-gradient(to right, transparent, hsl(var(--col-hue) / 0.7), transparent)',
        }}
      />
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: 'hsl(var(--col-hue))',
              boxShadow: '0 0 8px -1px hsl(var(--col-hue) / 0.7)',
            }}
          />
          {label}
        </h2>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              aria-label={t('addTask', { column: label })}
              title={t('addTask', { column: label })}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={t('collapseColumn', { column: label })}
              title={t('collapseColumn', { column: label })}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              <CollapseIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      {count === 0 ? (
        <div className="flex min-h-[6rem] items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
          {t('nothingHere')}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function DraggableCard({
  task,
  project,
  onSelect,
  onStart,
  onStop,
  onReopen,
  selected = false,
  onToggleSelect,
  blockedBy,
  focused = false,
  moveColumns,
  onMoveTo,
}: {
  task: TaskSummary;
  project?: ProjectTagInfo;
  onSelect: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onReopen?: () => void;
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
  blockedBy?: number;
  /** The keyboard-navigation focus ring (Phase 41 Theme D). */
  focused?: boolean;
  /** When set (touch widths), render the tap-to-move fallback over these columns. */
  moveColumns?: ColumnDef[];
  onMoveTo?: (target: Status) => void;
}) {
  const t = useTranslations('board');
  // useSortable = draggable + a drop target + within-list ordering, so cards can be
  // dragged across columns (status move) AND reordered vertically within one.
  // Only `listeners` (pointer handlers) are spread — NOT `attributes`. dnd-kit's
  // `attributes` add `role="button"`/`tabIndex`/`aria-roledescription` for keyboard
  // drag, but the board wires only Mouse+Touch sensors (no KeyboardSensor), so those
  // semantics are inert and merely nest the card's own button inside an interactive
  // wrapper (axe `nested-interactive`). Dropping them keeps pointer drag intact.
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  // Siblings shift via their sortable transform to open a gap; the dragged card
  // itself stays put as a dimmed placeholder (the DragOverlay renders the moving
  // copy), so its own transform is suppressed to avoid a double image.
  const sortableStyle = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
  };
  const canStart = task.status === 'todo' || task.status === 'backlog';
  // A running task (its session is live) can be stopped: interrupt the agent and
  // send the task back to todo. Mirrors the Start affordance on idle cards.
  const canStop = task.status === 'wip' || task.status === 'waiting';
  // A terminal task can be reopened back to todo (Phase 69 E).
  const canReopen = task.status === 'done' || task.status === 'abandoned';

  // Bring the keyboard-focused card into view as focus walks the board.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (focused) rootRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [focused]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        rootRef.current = node;
      }}
      style={sortableStyle}
      {...listeners}
      data-focused={focused || undefined}
      // The floating card follows the cursor via DragOverlay; here we just leave
      // a dimmed placeholder in the source column.
      className={cn(
        'group relative touch-none rounded-md',
        isDragging && 'opacity-40',
        selected && 'ring-2 ring-primary',
        // Keyboard focus ring — an offset outline, distinct from the selection
        // ring (above) and the dnd drag indicator so the three never read alike.
        focused && 'outline-none ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
    >
      {onToggleSelect ? (
        // Sibling of the card (not nested in its button); stop pointer-down so the
        // drag sensor doesn't claim the click. Hidden until hover, shown when selected.
        <span
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            'absolute left-2 top-2 z-10 rounded-md bg-background/90 backdrop-blur transition-opacity',
            selected ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100',
          )}
        >
          <SelectableIcon Icon={Square} selected={selected} onToggle={(sk) => onToggleSelect(sk)} />
        </span>
      ) : null}
      <TaskCard task={task} project={project} onSelect={onSelect} blockedBy={blockedBy} />
      {moveColumns && onMoveTo ? (
        // Touch fallback supersedes the hover-only Start/Stop (a phone has no
        // hover); moving to wip/todo via the menu runs the same spawn/restatus.
        <TapToMoveMenu currentStatus={task.status} columns={moveColumns} onMove={onMoveTo} />
      ) : canStart && onStart ? (
        <CardActionButton
          onClick={onStart}
          label={t('card.startTask')}
          title={t('card.start')}
          className="text-muted-foreground hover:text-foreground"
        >
          <Play className="h-3 w-3" />
        </CardActionButton>
      ) : canStop && onStop ? (
        <CardActionButton
          onClick={onStop}
          label={t('card.stopTask')}
          title={t('card.stop')}
          className="text-muted-foreground hover:border-destructive/50 hover:text-destructive"
        >
          <Square className="h-3 w-3 fill-current" />
        </CardActionButton>
      ) : canReopen && onReopen ? (
        <CardActionButton
          onClick={onReopen}
          label={t('card.reopenTask')}
          title={t('card.reopen')}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
        </CardActionButton>
      ) : null}
    </div>
  );
}

/** The hover-revealed action button in a card's top-right corner (Start / Stop). */
function CardActionButton({
  onClick,
  label,
  title,
  className,
  children,
}: {
  onClick: () => void;
  label: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Don't let the click bubble to the card (which would open the modal),
      // and keep the pointer-down off the drag sensor.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={title}
      className={cn(
        'absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-background/90 opacity-0 shadow-sm transition-[opacity,color,border-color] focus-visible:opacity-100 group-hover:opacity-100',
        className,
      )}
    >
      {children}
    </button>
  );
}
