'use client';

import { useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { TaskSummary } from '@midnite/shared';
import { ProjectProgressBar } from '@/components/project-progress';
import { TaskCard, type ProjectTagInfo } from '@/components/task-card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Sentinel drop id + lane id for the unassigned backlog (no milestone). */
export const BACKLOG_LANE_ID = '__backlog__';

type LaneData = {
  id: string;
  name: string;
  done: number;
  total: number;
  tasks: TaskSummary[];
  targetDate?: string;
};

type Props = {
  lane: LaneData;
  /** The backlog lane is a fixed catch-all: not sortable, not renamable/deletable. */
  isBacklog?: boolean;
  project?: ProjectTagInfo;
  onSelectTask: (task: TaskSummary) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
};

/**
 * Phase 58 E — one roadmap column. A milestone lane is a `@dnd-kit/sortable`
 * item (drag the header grip to reorder) whose body is a droppable target for
 * task cards (drag-to-assign). The backlog lane is fixed (no grip, no CRUD) but
 * still a drop target so a task can be unassigned by dragging it there.
 */
export function RoadmapLane({ lane, isBacklog, project, onSelectTask, onRename, onDelete }: Props) {
  const sortable = useSortable({
    id: lane.id,
    data: { type: 'lane' },
    disabled: isBacklog,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${lane.id}`,
    data: { type: 'lane-drop', laneId: lane.id },
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lane.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commitRename = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== lane.name) onRename?.(lane.id, next);
    else setDraft(lane.name);
  };

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-border/60 bg-card/40',
        sortable.isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-border/60 p-3">
        {!isBacklog ? (
          <button
            type="button"
            aria-label={`Reorder ${lane.name}`}
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        {editing ? (
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraft(lane.name);
                setEditing(false);
              }
            }}
            aria-label={`Rename ${lane.name}`}
            className="h-7 text-sm"
          />
        ) : (
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{lane.name}</h3>
        )}
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {lane.total}
        </span>
        {!isBacklog ? (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label={`${lane.name} options`}
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-border bg-popover p-1 shadow-md">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.(lane.id);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {lane.total > 0 ? (
        <div className="px-3 pt-2">
          <ProjectProgressBar done={lane.done} total={lane.total} />
        </div>
      ) : null}

      <div
        ref={setDropRef}
        className={cn(
          'flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-3',
          isOver && 'bg-accent/40 ring-1 ring-inset ring-ring',
        )}
      >
        {lane.tasks.map((task) => (
          <RoadmapCard key={task.id} task={task} project={project} onSelect={() => onSelectTask(task)} />
        ))}
        {lane.tasks.length === 0 ? (
          <p className="m-auto text-center text-xs text-muted-foreground">
            {isBacklog ? 'No unassigned tasks' : 'Drag tasks here'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A draggable task card inside a lane (drag to another lane to reassign). */
function RoadmapCard({
  task,
  project,
  onSelect,
}: {
  task: TaskSummary;
  project?: ProjectTagInfo;
  onSelect: () => void;
}) {
  // Draggable data shape (`type: 'task'`) is matched by the board's onDragEnd.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: { type: 'task', taskId: task.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn('cursor-grab active:cursor-grabbing', isDragging && 'opacity-40')}
    >
      <TaskCard task={task} project={project} onSelect={onSelect} />
    </div>
  );
}
