'use client';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import {
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  getNodesBounds,
  getViewportForBounds,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnEdgesDelete,
  type ReactFlowInstance,
} from '@xyflow/react';
import type { Project, Status, Task, TaskGraph, TaskSummary } from '@midnite/shared';
import { addTaskDependency, getTask, getTaskGraph, removeTaskDependency } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useTaskEvents } from '@/hooks/use-task-events';
import { useIsMobile } from '@/hooks/use-media-query';
import {
  layoutTaskGraph,
  topAlignedViewport,
  type TaskGraphNodeData,
} from '@/lib/task-graph-layout';
import { TASK_MODAL_PARAM } from '@/lib/task-route';
import { StyledSelect } from '@/components/ui/styled-select';
import { ProjectProgressBar } from '@/components/project-progress';
import { WorkItemModal } from '@/components/work-item-modal';
import { TaskGraphNode } from '@/components/task-graph/task-graph-node';
import { useToast } from '@/components/toast';

const PROJECT_PARAM = 'projectId';
const MILESTONE_PARAM = 'milestoneId';

// One custom node type; connectable (see the header doc comment below).
const nodeTypes: NodeTypes = { task: TaskGraphNode };

// The floor `fitView`/zoom-out clamps to. A large, mostly-disconnected board is
// far taller than the canvas, so the fit zoom hits this floor.
const MIN_ZOOM = 0.1;
// Breathing room (px) between the graph's bounding box and the canvas edges when
// we place the initial viewport.
const VIEWPORT_PADDING = 24;

type Props = {
  /** Board list — feeds the project picker + the task-detail modal's blocker pickers. */
  tasks: TaskSummary[];
  projects: Project[];
  /** False when a host page already renders a `?task=`-driven modal of its own
   *  (e.g. the Tasks page's graph view mode) — clicking a node still pushes the
   *  same `?task=` param, but this instance skips opening a second, redundant
   *  modal on top of the host's. Defaults to true (the standalone `/tasks/graph`
   *  route owns its own modal). */
  showTaskModal?: boolean;
  /** True when hosted inline on another page (the Tasks page's graph view mode)
   *  that already renders its own project-scoping filter + completion bar in its
   *  sticky toolbar — hides this component's own header bar (project picker,
   *  task/dependency count, milestone chip) and takes its scope from `projectIds`
   *  instead of the `?projectId=`/`?milestoneId=` query params. Defaults to
   *  false (the standalone `/tasks/graph` route owns its own header). */
  embedded?: boolean;
  /** Project ids to scope the graph to when `embedded` — the board's project
   *  multi-select; ignored otherwise (the standalone route reads its own
   *  `?projectId=` query param). Empty/undefined shows every project's tasks,
   *  matching "no project selected". */
  projectIds?: string[];
  /** Statuses to show when `embedded` — the board's status multi-select
   *  filter pills. Only nodes with one of these statuses are drawn; an edge
   *  still only renders when both its endpoints survive the filter (the same
   *  "both endpoints known" rule `layoutTaskGraph` already applies for a
   *  project-capped graph), so a filtered-out node's dependencies simply
   *  disappear rather than dangling. Empty/undefined shows every status. */
  statusFilter?: Status[];
};

/**
 * Phase 58 B — the dependency DAG over the server-authoritative `GET /tasks/graph`
 * (Phase 58 A) with a `dagre` left-to-right auto-layout. Nodes are connectable —
 * drag between two tasks to add a blocker, or select an edge and press
 * Delete/Backspace to remove one — mirroring the milestone graph's editable
 * gesture and the task detail modal's "Blocked by" picker. Mutations are
 * per-gesture optimistic with rollback, then reconciled by the live task
 * channel. Live via the shared reliable task channel; clicking a node opens the
 * existing `?task=` modal without leaving the graph.
 */
export function TaskGraphView({
  tasks,
  projects,
  showTaskModal = true,
  embedded = false,
  projectIds: scopeProjectIdsProp,
  statusFilter,
}: Props) {
  const t = useTranslations('board');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const toast = useToast();

  // Keep the board channel live so the graph tracks status/edge changes (Phase 56).
  useTaskEvents();

  // The standalone route drives its scope from `?projectId=` (single-select in
  // its own header); the embedded Tasks-page graph takes the board's project
  // multi-select via `projectIds`.
  const singleProjectId = embedded ? '' : (searchParams.get(PROJECT_PARAM) ?? '');
  const scopeProjectIds = useMemo(
    () => (embedded ? (scopeProjectIdsProp ?? []) : singleProjectId ? [singleProjectId] : []),
    [embedded, scopeProjectIdsProp, singleProjectId],
  );
  // A stable primitive key for the fetch deps + the ReactFlow remount (an array
  // identity would churn every render).
  const scopeKey = scopeProjectIds.join(',');
  // Phase 58 F — an optional milestone scope (deep-linked from a roadmap lane);
  // not exposed by the embedded Tasks-page graph, which has no milestone filter.
  const milestoneId = embedded ? '' : (searchParams.get(MILESTONE_PARAM) ?? '');
  const { data: fetched, loading } = useApiData(
    (signal) =>
      getTaskGraph(scopeProjectIds.length ? scopeProjectIds : undefined, milestoneId || undefined, signal),
    [scopeKey, milestoneId],
  );
  // Mirrored into local state (the roadmap-board/milestone-graph convention) so
  // connect/delete gestures can apply instantly and roll back on error, rather
  // than waiting on the live channel's refetch round-trip.
  const [graph, setGraph] = useState<TaskGraph | null>(null);
  useEffect(() => {
    if (fetched) setGraph(fetched);
  }, [fetched]);

  const onConnect = useCallback<OnConnect>(
    async (connection: Connection) => {
      const { source, target } = connection;
      if (!graph || !source || !target) return;
      // Edge runs blocker (source, upstream) → dependent (target): connecting
      // node A to node B means "B depends on A" (B is blocked by A).
      const prev = graph;
      setGraph((g) => (g ? addTaskDependencyLocal(g, target, source) : g));
      try {
        await addTaskDependency(target, source);
      } catch (err) {
        setGraph(prev);
        toast.error(err instanceof Error ? err.message : t('graph.toasts.addDependencyFailed'));
      }
    },
    [graph, toast, t],
  );

  const onEdgesDelete = useCallback<OnEdgesDelete>(
    async (deleted: Edge[]) => {
      if (!graph) return;
      const prev = graph;
      setGraph((g) => (g ? removeTaskDependenciesLocal(g, deleted) : g));
      try {
        await Promise.all(deleted.map((e) => removeTaskDependency(e.target, e.source)));
      } catch (err) {
        setGraph(prev);
        toast.error(err instanceof Error ? err.message : t('graph.toasts.removeDependencyFailed'));
      }
    },
    [graph, toast, t],
  );

  const projectOptions = useMemo(
    () => [
      { value: '', label: tCommon('allProjects') },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects, tCommon],
  );

  // Phase 58 C — when scoped to a project, show its completion (done/total tasks,
  // server-computed via Theme C) next to the picker; hidden for "All projects".
  const selectedProject = useMemo(
    () => (singleProjectId ? projects.find((p) => p.id === singleProjectId) : undefined),
    [singleProjectId, projects],
  );

  const setProject = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set(PROJECT_PARAM, id);
      else params.delete(PROJECT_PARAM);
      // Switching project drops a stale milestone filter.
      params.delete(MILESTONE_PARAM);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearMilestone = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(MILESTONE_PARAM);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  // A stable primitive key for the memo below — an array prop would otherwise
  // churn identity every render and defeat the memo (harmless, just wasteful).
  const statusKey = statusFilter?.join(',') ?? '';
  const { nodes, edges: layoutEdges } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    // Status filter narrows the node set *before* layout; `layoutTaskGraph`
    // already drops any edge whose endpoint isn't in `graph.nodes` (the
    // project-scope truncation relies on the same rule), so a filtered-out
    // node's edges disappear for free and the surviving edges keep the same
    // appearance rules (done/wip/quiet) unchanged.
    const scoped = statusFilter?.length
      ? { ...graph, nodes: graph.nodes.filter((n) => statusFilter.includes(n.status)) }
      : graph;
    return layoutTaskGraph(scoped);
  }, [graph, statusKey]);

  // React Flow's `edges` prop is "controlled": selecting an edge (a prerequisite
  // for deleting it with Backspace/Delete) only sticks if `onEdgesChange` applies
  // the change back onto the array we pass in — see the milestone graph's
  // identical fix. Mirror the derived layout into local state and let
  // `applyEdgeChanges` own selection.
  const [edges, setEdges] = useState<Edge[]>(layoutEdges);
  useEffect(() => setEdges(layoutEdges), [layoutEdges]);
  const onEdgesChange = useCallback<OnEdgesChange>(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  // Open the shared task modal in place (Phase 42 `?task=` param) — stays on the
  // graph. Skipped when a host page (the Tasks page's graph view mode) already
  // owns a modal for the same param, so a node click doesn't pop two.
  const openId = searchParams.get(TASK_MODAL_PARAM);
  const [selected, setSelected] = useState<Task | null>(null);
  useEffect(() => {
    if (!showTaskModal || !openId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    getTask(openId)
      .then((t) => !cancelled && setSelected(t))
      .catch(() => !cancelled && setSelected(null));
    return () => {
      cancelled = true;
    };
  }, [openId, showTaskModal]);

  const onNodeClick = useCallback<NodeMouseHandler>(
    (_, node: Node) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(TASK_MODAL_PARAM, node.id);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const closeTask = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(TASK_MODAL_PARAM);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const empty = !loading && graph && graph.nodes.length === 0;

  // The ReactFlow canvas wrapper — read at init to size the initial viewport.
  const flowWrapRef = useRef<HTMLDivElement>(null);

  // Place the initial viewport ourselves instead of `fitView`. A big board is
  // taller than the canvas, so the fit zoom bottoms out at MIN_ZOOM; `fitView`
  // then *centres* the (clamped, still-overflowing) graph, which pushes it down
  // and right — leaving a wasted band at the top and clipping the bottom. We
  // instead **top-align** it: the graph starts flush at the top of the canvas
  // (using that band) and overflows downward, so it still reaches the bottom.
  // Horizontally it's centred when it fits, else left-aligned. Small graphs that
  // fit outright fall back to a normal centred fit.
  const placeViewport = useCallback(
    (instance: ReactFlowInstance<Node<TaskGraphNodeData>>) => {
      const wrap = flowWrapRef.current;
      if (!wrap || nodes.length === 0) {
        void instance.fitView({ padding: 0.1 });
        return;
      }
      const { width, height } = wrap.getBoundingClientRect();
      if (width === 0 || height === 0) {
        void instance.fitView({ padding: 0.1 });
        return;
      }
      const bounds = getNodesBounds(nodes);
      // Reuse ReactFlow's own fit math to get the zoom it would pick (clamped to
      // MIN_ZOOM), then top-align the translate rather than centre it.
      const { zoom } = getViewportForBounds(bounds, width, height, MIN_ZOOM, 1, 0.1);
      instance.setViewport(topAlignedViewport(bounds, width, zoom, VIEWPORT_PADDING));
    },
    [nodes],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!embedded && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2">
          <StyledSelect
            aria-label={t('graph.filterByProject')}
            options={projectOptions}
            value={singleProjectId}
            onChange={setProject}
            className="w-52"
          />
          {graph ? (
            <span className="text-xs text-muted-foreground">
              {t('graph.summary', { tasks: graph.nodes.length, dependencies: edges.length })}
            </span>
          ) : null}
          {milestoneId ? (
            // Phase 58 F — surface + let the user clear a deep-linked milestone filter.
            <button
              type="button"
              onClick={clearMilestone}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-accent/40 px-2 py-0.5 text-xs text-foreground hover:bg-accent"
            >
              {t('graph.milestoneFilter')}
              <X className="h-3 w-3" aria-hidden />
              <span className="sr-only">{t('graph.clearMilestoneFilter')}</span>
            </button>
          ) : null}
          {selectedProject ? (
            <ProjectProgressBar project={selectedProject} className="ml-auto w-44" />
          ) : null}
        </div>
      )}

      {graph?.truncated ? (
        <div
          role="status"
          className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300"
        >
          {t('graph.truncated', { shown: graph.nodes.length, total: graph.totalCount })}
        </div>
      ) : null}

      <div ref={flowWrapRef} className="relative min-h-0 flex-1">
        {empty ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
            {scopeProjectIds.length ? t('graph.emptyScoped') : t('graph.empty')}
          </div>
        ) : (
          <ReactFlow
            // Remount to re-place the viewport when the scope (project) or node
            // count changes; steady-state refetches keep the same key, so the
            // user's pan/zoom is preserved.
            key={`${scopeKey}:${nodes.length}`}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onConnect={onConnect}
            onEdgesChange={onEdgesChange}
            onEdgesDelete={onEdgesDelete}
            // Top-align the initial viewport (see `placeViewport`) rather than the
            // default centred `fitView`, so the graph uses the top of the canvas.
            onInit={placeViewport}
            nodesDraggable={false}
            nodesConnectable
            elementsSelectable
            proOptions={{ hideAttribution: true }}
            minZoom={MIN_ZOOM}
          >
            <Background />
            <Controls showInteractive={false} />
            {isMobile ? null : <MiniMap pannable zoomable />}
          </ReactFlow>
        )}
      </div>

      {showTaskModal && selected ? (
        <WorkItemModal
          origin={{ kind: 'task', task: selected }}
          projects={projects}
          tasks={tasks}
          onClose={closeTask}
        />
      ) : null}
    </div>
  );
}

/** Add a "blocked by" edge (`taskId` depends on `dependsOnId`) in a fresh
 *  TaskGraph. A no-op if the edge already exists. */
export function addTaskDependencyLocal(graph: TaskGraph, taskId: string, dependsOnId: string): TaskGraph {
  if (graph.edges.some((e) => e.from === taskId && e.to === dependsOnId)) return graph;
  return { ...graph, edges: [...graph.edges, { from: taskId, to: dependsOnId }] };
}

/** Remove every given edge (React Flow's `{source, target}` shape, target = the
 *  dependent task, source = the blocker) from a fresh TaskGraph. */
export function removeTaskDependenciesLocal(
  graph: TaskGraph,
  removed: Array<{ source: string; target: string }>,
): TaskGraph {
  const toRemove = new Set(removed.map((e) => `${e.target}->${e.source}`));
  return { ...graph, edges: graph.edges.filter((e) => !toRemove.has(`${e.from}->${e.to}`)) };
}
