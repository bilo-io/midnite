'use client';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import type { Project, Task, TaskSummary } from '@midnite/shared';
import { getTask, getTaskGraph } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useTaskEvents } from '@/hooks/use-task-events';
import { useIsMobile } from '@/hooks/use-media-query';
import { layoutTaskGraph } from '@/lib/task-graph-layout';
import { TASK_MODAL_PARAM } from '@/lib/task-route';
import { StyledSelect } from '@/components/ui/styled-select';
import { ProjectProgressBar } from '@/components/project-progress';
import { WorkItemModal } from '@/components/work-item-modal';
import { TaskGraphNode } from '@/components/task-graph/task-graph-node';

const PROJECT_PARAM = 'projectId';
const MILESTONE_PARAM = 'milestoneId';

// One custom node type; read-only so no connect/drag handlers.
const nodeTypes: NodeTypes = { task: TaskGraphNode };

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
};

/**
 * Phase 58 B — the dependency DAG. Reuses `@xyflow/react` in read-only mode over
 * the server-authoritative `GET /tasks/graph` (Phase 58 A) with a `dagre`
 * left-to-right auto-layout. Live via the shared reliable task channel; clicking
 * a node opens the existing `?task=` modal without leaving the graph.
 */
export function TaskGraphView({ tasks, projects, showTaskModal = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  // Keep the board channel live so the graph tracks status/edge changes (Phase 56).
  useTaskEvents();

  const projectId = searchParams.get(PROJECT_PARAM) ?? '';
  // Phase 58 F — an optional milestone scope (deep-linked from a roadmap lane).
  const milestoneId = searchParams.get(MILESTONE_PARAM) ?? '';
  const { data: graph, loading } = useApiData(
    (signal) => getTaskGraph(projectId || undefined, milestoneId || undefined, signal),
    [projectId, milestoneId],
  );

  const projectOptions = useMemo(
    () => [
      { value: '', label: 'All projects' },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects],
  );

  // Phase 58 C — when scoped to a project, show its completion (done/total tasks,
  // server-computed via Theme C) next to the picker; hidden for "All projects".
  const selectedProject = useMemo(
    () => (projectId ? projects.find((p) => p.id === projectId) : undefined),
    [projectId, projects],
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

  const { nodes, edges } = useMemo(
    () => (graph ? layoutTaskGraph(graph) : { nodes: [], edges: [] }),
    [graph],
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2">
        <StyledSelect
          aria-label="Filter graph by project"
          options={projectOptions}
          value={projectId}
          onChange={setProject}
          className="w-52"
        />
        {graph ? (
          <span className="text-xs text-muted-foreground">
            {graph.nodes.length} task{graph.nodes.length === 1 ? '' : 's'} · {edges.length} dependenc
            {edges.length === 1 ? 'y' : 'ies'}
          </span>
        ) : null}
        {milestoneId ? (
          // Phase 58 F — surface + let the user clear a deep-linked milestone filter.
          <button
            type="button"
            onClick={clearMilestone}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-accent/40 px-2 py-0.5 text-xs text-foreground hover:bg-accent"
          >
            Milestone filter
            <X className="h-3 w-3" aria-hidden />
            <span className="sr-only">Clear milestone filter</span>
          </button>
        ) : null}
        {selectedProject ? (
          <ProjectProgressBar project={selectedProject} className="ml-auto w-44" />
        ) : null}
      </div>

      {graph?.truncated ? (
        <div
          role="status"
          className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300"
        >
          Showing the first {graph.nodes.length} of {graph.totalCount} tasks. Pick a project above to
          narrow the graph.
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {empty ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
            No tasks to graph{projectId ? ' for this project' : ''} yet.
          </div>
        ) : (
          <ReactFlow
            // Remount to re-fit when the scope (project) or node count changes;
            // steady-state refetches keep the same key, so zoom is preserved.
            key={`${projectId}:${nodes.length}`}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
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
