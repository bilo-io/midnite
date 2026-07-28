import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { RoadmapMilestone } from '@midnite/shared';

/**
 * Auto-layout for the milestone dependency graph — same `dagre` left-to-right
 * approach as `layoutTaskGraph`, but the node box isn't fixed: an expanded
 * milestone (showing its task list) is taller, so the graph is fully relaid
 * out on every expand/collapse rather than computed once per fetch.
 *
 * Edge direction: `from` (a milestone's blocker, upstream) → `to` (the
 * dependent milestone) — a blocker sits to the left, matching `layoutTaskGraph`'s
 * "what must finish first is upstream" convention.
 */

export const MILESTONE_GRAPH_NODE_WIDTH = 240;
export const MILESTONE_GRAPH_COLLAPSED_HEIGHT = 84;
const EXPANDED_HEADER_HEIGHT = 96; // name row + progress bar + add-task row
const EXPANDED_TASK_ROW_HEIGHT = 26;
const EXPANDED_MAX_HEIGHT = 320;

/** Data carried on each React Flow node, consumed by the custom node view. */
export type MilestoneGraphNodeData = RoadmapMilestone & { [key: string]: unknown };

export type LayoutedMilestoneGraph = {
  nodes: Node<MilestoneGraphNodeData>[];
  edges: Edge[];
};

/** The node box height for one milestone at its current expand state, capped
 *  with internal scroll past `EXPANDED_MAX_HEIGHT` for a milestone with many
 *  tasks — dagre still only reserves the capped height. */
export function milestoneNodeHeight(milestone: RoadmapMilestone, expanded: boolean): number {
  if (!expanded) return MILESTONE_GRAPH_COLLAPSED_HEIGHT;
  const content = EXPANDED_HEADER_HEIGHT + milestone.tasks.length * EXPANDED_TASK_ROW_HEIGHT;
  return Math.min(EXPANDED_MAX_HEIGHT, Math.max(MILESTONE_GRAPH_COLLAPSED_HEIGHT, content));
}

/**
 * Turn a project's milestones (+ each one's `dependsOn` edges) into positioned
 * React Flow nodes + edges. Pure — no React, no DOM — so it's unit-testable
 * and cheap to memoize on `[milestones, expandedIds]`.
 */
export function layoutMilestoneGraph(
  milestones: RoadmapMilestone[],
  expandedIds: ReadonlySet<string>,
): LayoutedMilestoneGraph {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 32, ranksep: 100, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  const known = new Set(milestones.map((m) => m.id));
  for (const m of milestones) {
    g.setNode(m.id, { width: MILESTONE_GRAPH_NODE_WIDTH, height: milestoneNodeHeight(m, expandedIds.has(m.id)) });
  }
  // Rank the blocker upstream of the dependent so completion order flows left→right.
  for (const m of milestones) {
    for (const blockerId of m.dependsOn) {
      if (known.has(blockerId)) g.setEdge(blockerId, m.id);
    }
  }

  dagre.layout(g);

  const nodes: Node<MilestoneGraphNodeData>[] = milestones.map((m) => {
    const pos = g.node(m.id);
    const height = milestoneNodeHeight(m, expandedIds.has(m.id));
    // dagre reports the node centre; React Flow positions from the top-left.
    return {
      id: m.id,
      type: 'milestone',
      position: { x: pos.x - MILESTONE_GRAPH_NODE_WIDTH / 2, y: pos.y - height / 2 },
      data: { ...m },
      draggable: false,
      connectable: true,
    };
  });

  const edges: Edge[] = milestones.flatMap((m) =>
    m.dependsOn
      .filter((blockerId) => known.has(blockerId))
      .map((blockerId) => ({
        id: `${blockerId}->${m.id}`,
        source: blockerId,
        target: m.id,
        style: { stroke: 'hsl(var(--foreground))', strokeWidth: 1.5 },
      })),
  );

  return { nodes, edges };
}
