'use client';

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Play } from 'lucide-react';
import type { Status, Task } from '@midnite/shared';
import { AbandonedRow } from '@/components/abandoned-row';
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
}: TaskViewProps) {
  const grouped = groupByStatus(tasks);

  // A small activation distance lets a plain click still reach the card's button
  // (open the modal) while a deliberate drag starts only after the pointer moves.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const target = event.over?.id;
    const taskId = event.active.id;
    if (typeof target === 'string' && typeof taskId === 'string') {
      onMove?.(taskId, target as Status);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
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
        <div className="-mr-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
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
}: {
  task: Task;
  project?: ProjectTagInfo;
  onSelect: () => void;
  onStart?: () => void;
}) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const canStart = task.status === 'todo' || task.status === 'backlog';
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn('group relative touch-none', isDragging && 'z-10 opacity-60')}
    >
      <TaskCard task={task} project={project} onSelect={onSelect} />
      {canStart && onStart ? (
        <button
          type="button"
          // Don't let the click bubble to the card (which would open the modal),
          // and keep the pointer-down off the drag sensor.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          aria-label="Start task"
          title="Start"
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Play className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
