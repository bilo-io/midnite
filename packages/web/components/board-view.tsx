'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Status, Task } from '@midnite/shared';
import { AbandonedRow } from '@/components/abandoned-row';
import { SelectableIcon } from '@/components/selectable-icon';
import { TaskCard, type ProjectTagInfo } from '@/components/task-card';
import { type TaskViewProps, groupByStatus } from '@/components/task-columns';
import { cn } from '@/lib/utils';

/**
 * Kanban layout for the Tasks page: one column per visible status, scrolling
 * horizontally. Cards drag between columns; dropping into "In progress" from
 * todo/backlog (or hitting Start) spawns an agent session via `onMove`.
 * Presentational otherwise — filtering, the project lookup and the detail modal
 * are owned by TasksView.
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

  // A small activation distance lets a plain click still reach the card's button
  // (open the modal) while a deliberate drag starts only after the pointer moves.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const target = event.over?.id;
    const taskId = event.active.id;
    if (typeof target === 'string' && typeof taskId === 'string') {
      onMove?.(taskId, target as Status);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
        {columns.map((col) => (
          <Column
            key={col.status}
            status={col.status}
            label={col.label}
            hueVar={col.hueVar}
            count={(grouped.get(col.status) ?? []).length}
          >
            {(grouped.get(col.status) ?? []).map((t) => (
              <DraggableCard
                key={t.id}
                task={t}
                project={t.projectId ? projectsById.get(t.projectId) : undefined}
                onSelect={() => onSelect(t)}
                onStart={onMove ? () => onMove(t.id, 'wip') : undefined}
                onStop={onMove ? () => onMove(t.id, 'todo') : undefined}
                selected={isSelected?.(t.id) ?? false}
                onToggleSelect={onToggleSelect ? (sk) => onToggleSelect(t.id, sk) : undefined}
              />
            ))}
          </Column>
        ))}
      </div>

      {showAbandoned && (
        <AbandonedRow
          tasks={grouped.get('abandoned') ?? []}
          onSelect={onSelect}
          projectsById={projectsById}
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
        'relative flex h-full min-w-[240px] flex-1 flex-col overflow-hidden rounded-lg border bg-card/60 p-3 backdrop-blur-sm transition-colors',
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
        <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground/70">
          Nothing here
        </div>
      ) : (
        <div className="-m-1.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1.5">
          {children}
        </div>
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
}: {
  task: Task;
  project?: ProjectTagInfo;
  onSelect: () => void;
  onStart?: () => void;
  onStop?: () => void;
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: task.id,
  });
  const canStart = task.status === 'todo' || task.status === 'backlog';
  // A running task (its session is live) can be stopped: interrupt the agent and
  // send the task back to todo. Mirrors the Start affordance on idle cards.
  const canStop = task.status === 'wip' || task.status === 'waiting';
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // The floating card follows the cursor via DragOverlay; here we just leave
      // a dimmed placeholder in the source column.
      className={cn(
        'group relative touch-none rounded-md',
        isDragging && 'opacity-40',
        selected && 'ring-2 ring-primary',
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
      <TaskCard task={task} project={project} onSelect={onSelect} />
      {canStart && onStart ? (
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
