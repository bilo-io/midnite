import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { TaskGraph, TaskGraphNode } from '@midnite/shared';

/**
 * Phase 58 B — auto-layout for the dependency DAG. The workflow editor persists
 * manual node positions; dependency tasks have none, so we compute them with
 * `dagre` from the edge set alone.
 *
 * Direction is **left-to-right** (`rankdir: 'LR'`): a task's blockers sit to its
 * left, so reading left→right follows completion order (what must finish first is
 * upstream). Edges are drawn blocker → dependent (source = the blocker), which
 * keeps every arrow pointing rightward and matches the rank order.
 */

/** Fixed node box dagre lays out around; must match the rendered node's CSS size. */
export const GRAPH_NODE_WIDTH = 220;
export const GRAPH_NODE_HEIGHT = 68;

/** Data carried on each React Flow node, consumed by the custom node view. */
export type TaskGraphNodeData = TaskGraphNode & { [key: string]: unknown };

export type LayoutedGraph = {
  nodes: Node<TaskGraphNodeData>[];
  edges: Edge[];
};

/**
 * Turn the server's `{nodes, edges}` into positioned React Flow nodes + edges.
 * Pure — no React, no DOM — so it's unit-testable and cheap to memoize.
 */
export function layoutTaskGraph(graph: TaskGraph): LayoutedGraph {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 28, ranksep: 90, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  const known = new Set(graph.nodes.map((n) => n.id));
  for (const node of graph.nodes) {
    g.setNode(node.id, { width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT });
  }
  // Rank the blocker (`to`) upstream of the dependent (`from`) so completion
  // order flows left→right. Skip dangling edges whose endpoints were capped out.
  for (const edge of graph.edges) {
    if (known.has(edge.from) && known.has(edge.to)) g.setEdge(edge.to, edge.from);
  }

  dagre.layout(g);

  const nodes: Node<TaskGraphNodeData>[] = graph.nodes.map((node) => {
    const pos = g.node(node.id);
    // dagre reports the node centre; React Flow positions from the top-left.
    return {
      id: node.id,
      type: 'task',
      position: { x: pos.x - GRAPH_NODE_WIDTH / 2, y: pos.y - GRAPH_NODE_HEIGHT / 2 },
      data: { ...node },
      draggable: false,
      connectable: false,
    };
  });

  const byId = new Map(graph.nodes.map((n) => [n.id, n] as const));
  const edges: Edge[] = graph.edges
    .filter((e) => known.has(e.from) && known.has(e.to))
    .map((e) => {
      // Edge runs blocker (`to`, the source/upstream) → dependent (`from`, target).
      const appearance = edgeAppearance(byId.get(e.to), byId.get(e.from));
      return {
        id: `${e.to}->${e.from}`,
        source: e.to,
        target: e.from,
        ...appearance,
      };
    });

  return { nodes, edges };
}

/**
 * Edge appearance encodes the dependency's state at a glance, keyed off its two
 * endpoints (source = the blocker, target = the dependent it feeds):
 *
 * - both `done`           → solid green, slightly thicker: the chain is complete.
 * - blocker `done`        → animated green dotted: a finished blocker has opened
 *                           the flow to its (now-unblocked) dependent.
 * - blocker `wip`/`waiting` → animated orange dotted: work is happening upstream
 *                           of a still-blocked dependent.
 * - otherwise             → static white: a quiet, not-yet-started dependency.
 */
function edgeAppearance(
  source: TaskGraphNode | undefined,
  target: TaskGraphNode | undefined,
): Pick<Edge, 'animated' | 'style'> {
  const green = 'hsl(var(--status-done))';
  const orange = 'hsl(var(--status-wip))';
  const neutral = 'hsl(var(--foreground))';
  const dotted = '6 4';

  const sourceDone = source?.status === 'done';
  const targetDone = target?.status === 'done';
  const sourceActive = source?.status === 'wip' || source?.status === 'waiting';

  // Both endpoints complete — the dependency is satisfied end-to-end.
  if (sourceDone && targetDone) {
    return { animated: false, style: { stroke: green, strokeWidth: 2.5 } };
  }
  // A completed blocker feeding its now-unblocked dependent.
  if (sourceDone) {
    return { animated: true, style: { stroke: green, strokeWidth: 2, strokeDasharray: dotted } };
  }
  // An in-progress blocker (wip / waiting) feeding a still-blocked dependent.
  if (sourceActive) {
    return { animated: true, style: { stroke: orange, strokeWidth: 2, strokeDasharray: dotted } };
  }
  // A quiet, not-yet-started dependency chain.
  return { animated: false, style: { stroke: neutral, strokeWidth: 1.5 } };
}
