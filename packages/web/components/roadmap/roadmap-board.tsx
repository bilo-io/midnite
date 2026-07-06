'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import type { RoadmapView, TaskSummary } from '@midnite/shared';
import {
  assignTaskMilestone,
  createMilestone,
  deleteMilestone,
  getRoadmap,
  reorderMilestones,
  updateMilestone,
} from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useApiData } from '@/lib/use-api-data';
import { useTaskEvents } from '@/hooks/use-task-events';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm-dialog';
import { TaskCard, type ProjectTagInfo } from '@/components/task-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BACKLOG_LANE_ID, RoadmapLane } from '@/components/roadmap/roadmap-lane';

type Props = {
  projectId: string;
  project?: ProjectTagInfo;
  onSelectTask: (task: TaskSummary) => void;
};

/**
 * Phase 58 E — the project roadmap: milestones as ordered lanes (drag the header
 * grip to reorder) + an unassigned backlog lane, each with a computed progress
 * bar. Drag a task between lanes to (re)assign it. Reorder/assign are optimistic
 * with rollback on error; the reliable task channel (Phase 56) keeps it live.
 */
export function RoadmapBoard({ projectId, project, onSelectTask }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  useTaskEvents();

  const { data: fetched, loading } = useApiData(
    (signal) => getRoadmap(projectId, signal),
    [projectId],
  );

  // Local mirror so reorder/assign feel instant; re-seeded whenever the server
  // view changes (initial load + WS-driven refetch).
  const [view, setView] = useState<RoadmapView | null>(null);
  useEffect(() => {
    if (fetched) setView(fetched);
  }, [fetched]);

  const [activeTask, setActiveTask] = useState<TaskSummary | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const laneIds = useMemo(() => view?.milestones.map((m) => m.id) ?? [], [view]);

  const onDragStart = useCallback(
    (e: DragStartEvent) => {
      if (e.active.data.current?.type === 'task') {
        const id = e.active.data.current.taskId as string;
        const all = view ? [...view.milestones.flatMap((m) => m.tasks), ...view.backlog] : [];
        setActiveTask(all.find((t) => t.id === id) ?? null);
      }
    },
    [view],
  );

  const onDragEnd = useCallback(
    async (e: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = e;
      if (!over || !view) return;

      // Lane reorder.
      if (active.data.current?.type === 'lane' && over.data.current?.type !== 'task') {
        const from = laneIds.indexOf(active.id as string);
        const to = laneIds.indexOf(over.id as string);
        if (from === -1 || to === -1 || from === to) return;
        const nextOrder = arrayMove(laneIds, from, to);
        const prev = view;
        setView({
          ...view,
          milestones: nextOrder.map((id) => view.milestones.find((m) => m.id === id)!),
        });
        try {
          await reorderMilestones(projectId, nextOrder);
        } catch (err) {
          setView(prev);
          toast.error(err instanceof Error ? err.message : 'Failed to reorder milestones');
        }
        return;
      }

      // Task assignment: dropped over a lane droppable.
      if (active.data.current?.type === 'task' && over.data.current?.type === 'lane-drop') {
        const taskId = active.data.current.taskId as string;
        const laneId = over.data.current.laneId as string;
        const targetMilestoneId = laneId === BACKLOG_LANE_ID ? null : laneId;
        const moved = moveTaskLocal(view, taskId, targetMilestoneId);
        if (!moved) return; // no-op (same lane)
        const prev = view;
        setView(moved);
        try {
          await assignTaskMilestone(taskId, targetMilestoneId);
        } catch (err) {
          setView(prev);
          toast.error(err instanceof Error ? err.message : 'Failed to assign task');
        }
      }
    },
    [view, laneIds, projectId, toast],
  );

  const onAdd = useCallback(async () => {
    const name = newName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    setNewName('');
    setAdding(false);
    try {
      await createMilestone(projectId, { name });
      invalidateData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create milestone');
    }
  }, [newName, projectId, toast]);

  const onRename = useCallback(
    async (id: string, name: string) => {
      try {
        await updateMilestone(id, { name });
        invalidateData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to rename milestone');
      }
    },
    [toast],
  );

  const onDelete = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: 'Delete milestone?',
        description: 'Its tasks are moved back to the backlog — they are not deleted.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteMilestone(id);
        invalidateData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete milestone');
      }
    },
    [confirm, toast],
  );

  if (!view) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        {loading ? 'Loading roadmap…' : 'No roadmap yet.'}
      </p>
    );
  }

  const empty = view.milestones.length === 0 && view.backlog.length === 0;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex items-start gap-3 overflow-x-auto pb-2">
        <SortableContext items={laneIds} strategy={horizontalListSortingStrategy}>
          {view.milestones.map((m) => (
            <RoadmapLane
              key={m.id}
              lane={{ id: m.id, name: m.name, done: m.done, total: m.total, tasks: m.tasks, targetDate: m.targetDate }}
              project={project}
              onSelectTask={onSelectTask}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {/* Backlog is a fixed catch-all lane, pinned after the ordered milestones. */}
        <RoadmapLane
          lane={{
            id: BACKLOG_LANE_ID,
            name: 'Backlog',
            done: view.backlog.filter((t) => t.status === 'done').length,
            total: view.backlog.length,
            tasks: view.backlog,
          }}
          isBacklog
          project={project}
          onSelectTask={onSelectTask}
        />

        {/* Add-milestone affordance. */}
        <div className="w-64 shrink-0">
          {adding ? (
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={onAdd}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAdd();
                if (e.key === 'Escape') {
                  setNewName('');
                  setAdding(false);
                }
              }}
              placeholder="Milestone name…"
              aria-label="New milestone name"
              className="h-9"
            />
          ) : (
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add milestone
            </Button>
          )}
        </div>
      </div>

      {empty ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No milestones yet — add one to group this project&apos;s tasks into a plan.
        </p>
      ) : null}

      {typeof document !== 'undefined'
        ? createPortal(
            <DragOverlay>
              {activeTask ? (
                <div className="w-64 rotate-2 opacity-90">
                  <TaskCard task={activeTask} project={project} />
                </div>
              ) : null}
            </DragOverlay>,
            document.body,
          )
        : null}
    </DndContext>
  );
}

/**
 * Move a task to a target milestone (`null` = backlog) in a fresh RoadmapView,
 * recomputing each affected lane's done/total. Returns `null` if the task is
 * already in the target lane (no-op).
 */
function moveTaskLocal(view: RoadmapView, taskId: string, target: string | null): RoadmapView | null {
  const currentMilestone = view.milestones.find((m) => m.tasks.some((t) => t.id === taskId));
  const currentLaneId = currentMilestone?.id ?? null;
  if (currentLaneId === target) return null;

  const task =
    currentMilestone?.tasks.find((t) => t.id === taskId) ??
    view.backlog.find((t) => t.id === taskId);
  if (!task) return null;
  const moved: TaskSummary = { ...task, milestoneId: target ?? undefined };

  const stripped = (tasks: TaskSummary[]) => tasks.filter((t) => t.id !== taskId);
  const withCounts = (tasks: TaskSummary[]) => ({
    tasks,
    done: tasks.filter((t) => t.status === 'done').length,
    total: tasks.length,
  });

  const milestones = view.milestones.map((m) => {
    if (m.id === currentLaneId) return { ...m, ...withCounts(stripped(m.tasks)) };
    if (m.id === target) return { ...m, ...withCounts([...m.tasks, moved]) };
    return m;
  });
  const backlog =
    target === null ? [...stripped(view.backlog), moved] : stripped(view.backlog);

  return { ...view, milestones, backlog };
}
