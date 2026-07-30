'use client';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  applyEdgeChanges,
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnEdgesDelete,
} from '@xyflow/react';
import type { RoadmapView, TaskSummary } from '@midnite/shared';
import {
  addMilestoneDependency,
  assignTaskMilestone,
  createTask,
  getRoadmap,
  removeMilestoneDependency,
  updateMilestone,
} from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useApiData } from '@/lib/use-api-data';
import { useTaskEvents } from '@/hooks/use-task-events';
import { useToast } from '@/components/toast';
import { moveTaskLocal } from '@/components/roadmap/roadmap-board';
import { MilestoneGraphNode, type MilestoneGraphNodeCallbacks } from '@/components/roadmap/milestone-graph-node';
import { layoutMilestoneGraph, type MilestoneGraphNodeData } from '@/lib/milestone-graph-layout';

const nodeTypes: NodeTypes = { milestone: MilestoneGraphNode };
const MIN_ZOOM = 0.2;

type Props = {
  projectId: string;
  onSelectTask: (task: TaskSummary) => void;
};

/**
 * The editable milestone dependency graph — `dagre`-laid-out nodes (one per
 * milestone) whose edges are the "blocked by" relation, mirroring the task
 * graph's editable gesture. Nodes are connectable (drag between two nodes to
 * add/rewire a dependency) and expand in place to show + edit a milestone's
 * tasks. Mutations are per-gesture optimistic with rollback (the roadmap-board
 * convention), not the workflow editor's debounced-autosave model — milestones
 * already commit every edit immediately everywhere else in this module.
 */
export function MilestoneGraphView({ projectId, onSelectTask }: Props) {
  const t = useTranslations('board');
  const toast = useToast();
  useTaskEvents();

  const { data: fetched } = useApiData((signal) => getRoadmap(projectId, signal), [projectId]);
  const [view, setView] = useState<RoadmapView | null>(null);
  useEffect(() => {
    if (fetched) setView(fetched);
  }, [fetched]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const milestones = useMemo(() => view?.milestones ?? [], [view]);

  const onRename = useCallback(
    async (id: string, name: string) => {
      const prev = view;
      setView((v) => (v ? renameMilestoneLocal(v, id, name) : v));
      try {
        await updateMilestone(id, { name });
      } catch (err) {
        setView(prev);
        toast.error(err instanceof Error ? err.message : t('roadmapGraph.toasts.renameFailed'));
      }
    },
    [view, toast, t],
  );

  const onUnassignTask = useCallback(
    async (taskId: string) => {
      if (!view) return;
      const moved = moveTaskLocal(view, taskId, null);
      if (!moved) return;
      const prev = view;
      setView(moved);
      try {
        await assignTaskMilestone(taskId, null);
      } catch (err) {
        setView(prev);
        toast.error(err instanceof Error ? err.message : t('roadmapGraph.toasts.removeTaskFailed'));
      }
    },
    [view, toast, t],
  );

  const onAddTask = useCallback(
    async (milestoneId: string, title: string) => {
      try {
        const form = new FormData();
        form.append('prompt', title);
        form.append('projectId', projectId);
        const { task } = await createTask(form);
        await assignTaskMilestone(task.id, milestoneId);
        invalidateData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('roadmapGraph.toasts.addTaskFailed'));
      }
    },
    [projectId, toast, t],
  );

  const onConnect = useCallback<OnConnect>(
    async (connection: Connection) => {
      const { source, target } = connection;
      if (!view || !source || !target) return;
      // Edge runs blocker (source, upstream) → dependent (target): connecting
      // node A to node B means "B depends on A" (B is blocked by A).
      const prev = view;
      setView((v) => (v ? addDependencyLocal(v, target, source) : v));
      try {
        await addMilestoneDependency(target, source);
      } catch (err) {
        setView(prev);
        toast.error(err instanceof Error ? err.message : t('graph.toasts.addDependencyFailed'));
      }
    },
    [view, toast, t],
  );

  const onEdgesDelete = useCallback<OnEdgesDelete>(
    async (deleted: Edge[]) => {
      if (!view) return;
      const prev = view;
      setView((v) => (v ? removeDependenciesLocal(v, deleted) : v));
      try {
        await Promise.all(deleted.map((e) => removeMilestoneDependency(e.target, e.source)));
      } catch (err) {
        setView(prev);
        toast.error(err instanceof Error ? err.message : t('graph.toasts.removeDependencyFailed'));
      }
    },
    [view, toast, t],
  );

  const { nodes: laidOutNodes, edges: layoutEdges } = useMemo(
    () => layoutMilestoneGraph(milestones, expandedIds),
    [milestones, expandedIds],
  );

  // React Flow's `edges` prop is "controlled": selecting an edge (a prerequisite
  // for deleting it with Backspace/Delete) only sticks if `onEdgesChange` applies
  // the change back onto the array we pass in — without it, clicks never mark an
  // edge selected, so `onEdgesDelete` never has anything to fire on. Mirror the
  // derived layout into local state and let `applyEdgeChanges` own selection;
  // resetting on every layout change is fine since the dependency edges are the
  // real source of truth (selection is disposable UI state).
  const [edges, setEdges] = useState<Edge[]>(layoutEdges);
  useEffect(() => setEdges(layoutEdges), [layoutEdges]);
  const onEdgesChange = useCallback<OnEdgesChange>(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const allTasksById = useMemo(() => {
    const map = new Map<string, TaskSummary>();
    for (const m of milestones) for (const t of m.tasks) map.set(t.id, t);
    return map;
  }, [milestones]);

  const nodes = useMemo<Node<MilestoneGraphNodeData & MilestoneGraphNodeCallbacks>[]>(
    () =>
      laidOutNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          expanded: expandedIds.has(n.id),
          onToggleExpand: () => toggleExpand(n.id),
          onRename: (name: string) => onRename(n.id, name),
          onSelectTask: (taskId: string) => {
            const task = allTasksById.get(taskId);
            if (task) onSelectTask(task);
          },
          onUnassignTask: (taskId: string) => onUnassignTask(taskId),
          onAddTask: (title: string) => onAddTask(n.id, title),
        },
      })),
    [laidOutNodes, expandedIds, toggleExpand, onRename, onSelectTask, onUnassignTask, onAddTask, allTasksById],
  );

  if (!view) {
    return <p className="p-8 text-center text-sm text-muted-foreground">{t('roadmapGraph.loading')}</p>;
  }

  if (milestones.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">{t('roadmapGraph.noMilestones')}</p>
    );
  }

  return (
    <div className="h-[calc(100vh-16rem)] min-h-[420px] rounded-lg border border-border/60">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={onEdgesDelete}
        nodesDraggable={false}
        nodesConnectable
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        minZoom={MIN_ZOOM}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

/** Rename one milestone in a fresh RoadmapView. */
export function renameMilestoneLocal(view: RoadmapView, id: string, name: string): RoadmapView {
  return { ...view, milestones: view.milestones.map((m) => (m.id === id ? { ...m, name } : m)) };
}

/** Add a "blocked by" edge (`milestoneId` depends on `dependsOnId`) in a fresh
 *  RoadmapView. A no-op if the edge already exists. */
export function addDependencyLocal(view: RoadmapView, milestoneId: string, dependsOnId: string): RoadmapView {
  return {
    ...view,
    milestones: view.milestones.map((m) =>
      m.id === milestoneId && !m.dependsOn.includes(dependsOnId) ? { ...m, dependsOn: [...m.dependsOn, dependsOnId] } : m,
    ),
  };
}

/** Remove every given edge (React Flow's `{source, target}` shape, target =
 *  the dependent milestone, source = the blocker) in a fresh RoadmapView. */
export function removeDependenciesLocal(
  view: RoadmapView,
  removed: Array<{ source: string; target: string }>,
): RoadmapView {
  return {
    ...view,
    milestones: view.milestones.map((m) => {
      const blockerIds = removed.filter((e) => e.target === m.id).map((e) => e.source);
      if (blockerIds.length === 0) return m;
      return { ...m, dependsOn: m.dependsOn.filter((id) => !blockerIds.includes(id)) };
    }),
  };
}
