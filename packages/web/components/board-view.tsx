'use client';

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Play, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Status, Task } from '@midnite/shared';
import { AbandonedRow } from '@/components/abandoned-row';
import { VirtualList } from '@/components/ui/virtual-list';
import { useConfirm } from '@/components/confirm-dialog';
import { SelectableIcon } from '@/components/selectable-icon';
import { TapToMoveMenu } from '@/components/tap-to-move-menu';
import { TaskCard, type ProjectTagInfo } from '@/components/task-card';
import { type ColumnDef, type TaskViewProps, groupByStatus } from '@/components/task-columns';
import { arrowDir, nextFocusId, type FocusGrid } from '@/lib/board-nav';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

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
export function BoardView({
  tasks,
  columns,
  projectsById,
  onSelect,
  showAbandoned,
  onMove,
  isSelected,
  onToggleSelect,
  blockedCounts,
}: TaskViewProps) {
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
    const target = event.over?.id;
    const taskId = event.active.id;
    if (typeof target === 'string' && typeof taskId === 'string') {
      onMove?.(taskId, target as Status);
    }
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

  // The visible grid, in render order, rebuilt each render from the same grouping
  // the columns use — so navigation always matches what's on screen.
  const grid: FocusGrid = columns.map((col) => (grouped.get(col.status) ?? []).map((t) => t.id));

  // Keep a ref to the latest grid + handlers so the keydown effect can stay
  // subscribed once without re-binding on every task/grouping change.
  const navRef = useRef({ grid, focusedId, tasks, onSelect, onMove, confirm });
  navRef.current = { grid, focusedId, tasks, onSelect, onMove, confirm };

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      // Don't fight inputs or a modal's own focus-trapped keys.
      if (inEditableElement()) return;
      if (visibleModalOpen()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const { grid, focusedId, tasks, onSelect, onMove, confirm } = navRef.current;

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
              title: 'Mark this task done again?',
              description: 'It is already in Done.',
              confirmLabel: 'Mark done',
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
            title: 'Abandon this task?',
            description: 'It moves to Abandoned and its session (if any) is archived.',
            confirmLabel: 'Abandon',
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
    <div className="flex min-h-0 flex-1 flex-col">
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
              {col.label}
              <span className="rounded-full bg-muted/70 px-1.5 py-px tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {/*
         * Desktop: flex row with gap + horizontal scroll (unchanged behaviour).
         * Mobile: snap-scroll — each column fills the viewport width; swipe left/right
         * to page between columns. No gap between columns on mobile (inner padding used).
         */}
        <div
          ref={scrollRef}
          onScroll={isMobile ? handleScroll : undefined}
          // Focusable so keyboard users can scroll the board even when a column has
          // no focusable cards (axe `scrollable-region-focusable`).
          tabIndex={0}
          role="group"
          aria-label="Task board"
          className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1 max-md:snap-x max-md:snap-mandatory max-md:scroll-smooth max-md:gap-0"
        >
          {columns.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              label={col.label}
              hueVar={col.hueVar}
              count={(grouped.get(col.status) ?? []).length}
            >
              <VirtualList
                items={grouped.get(col.status) ?? []}
                rowKey={(t) => t.id}
                gap={8}
                estimateRow={92}
                className="-m-1.5 min-h-0 flex-1 p-1.5"
                renderRow={(t) => (
                  <DraggableCard
                    task={t}
                    project={t.projectId ? projectsById.get(t.projectId) : undefined}
                    onSelect={() => onSelect(t)}
                    onStart={onMove ? () => onMove(t.id, 'wip') : undefined}
                    onStop={onMove ? () => onMove(t.id, 'todo') : undefined}
                    selected={isSelected?.(t.id) ?? false}
                    onToggleSelect={onToggleSelect ? (sk) => onToggleSelect(t.id, sk) : undefined}
                    blockedBy={blockedCounts?.get(t.id)}
                    focused={t.id === focusedId}
                    // On a phone, drag is finicky — offer the tap-to-move fallback.
                    moveColumns={isMobile && onMove ? columns : undefined}
                    onMoveTo={onMove ? (target) => onMove(t.id, target) : undefined}
                  />
                )}
              />
            </Column>
          ))}
        </div>

        {showAbandoned && (
          <AbandonedRow
            tasks={grouped.get('abandoned') ?? []}
            onSelect={onSelect}
            projectsById={projectsById}
            blockedCounts={blockedCounts}
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

function Column({
  status,
  label,
  hueVar,
  count,
  children,
}: {
  status: Status;
  label: string;
  hueVar: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        // Desktop: flexible columns that grow to fill available space.
        'relative flex h-full min-w-[240px] flex-1 flex-col overflow-hidden rounded-lg border bg-card/60 p-3 backdrop-blur-sm transition-colors',
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
        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
          Nothing here
        </div>
      ) : (
        // The card list (VirtualList) brings its own scroll container so it can be
        // the virtualizer's scroll element (Phase 57 F).
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
  selected = false,
  onToggleSelect,
  blockedBy,
  focused = false,
  moveColumns,
  onMoveTo,
}: {
  task: Task;
  project?: ProjectTagInfo;
  onSelect: () => void;
  onStart?: () => void;
  onStop?: () => void;
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
  blockedBy?: number;
  /** The keyboard-navigation focus ring (Phase 41 Theme D). */
  focused?: boolean;
  /** When set (touch widths), render the tap-to-move fallback over these columns. */
  moveColumns?: ColumnDef[];
  onMoveTo?: (target: Status) => void;
}) {
  // Only `listeners` (pointer handlers) are spread — NOT `attributes`. dnd-kit's
  // `attributes` add `role="button"`/`tabIndex`/`aria-roledescription` for keyboard
  // drag, but the board wires only Mouse+Touch sensors (no KeyboardSensor), so those
  // semantics are inert and merely nest the card's own button inside an interactive
  // wrapper (axe `nested-interactive`). Dropping them keeps pointer drag intact.
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: task.id,
  });
  const canStart = task.status === 'todo' || task.status === 'backlog';
  // A running task (its session is live) can be stopped: interrupt the agent and
  // send the task back to todo. Mirrors the Start affordance on idle cards.
  const canStop = task.status === 'wip' || task.status === 'waiting';

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
          label="Start task"
          title="Start"
          className="text-muted-foreground hover:text-foreground"
        >
          <Play className="h-3 w-3" />
        </CardActionButton>
      ) : canStop && onStop ? (
        <CardActionButton
          onClick={onStop}
          label="Stop task"
          title="Stop"
          className="text-muted-foreground hover:border-destructive/50 hover:text-destructive"
        >
          <Square className="h-3 w-3 fill-current" />
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
