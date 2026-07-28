import { describe, expect, it } from 'vitest';
import type { RoadmapMilestone } from '@midnite/shared';
import {
  MILESTONE_GRAPH_COLLAPSED_HEIGHT,
  layoutMilestoneGraph,
  milestoneNodeHeight,
} from './milestone-graph-layout';

function milestone(id: string, over: Partial<RoadmapMilestone> = {}): RoadmapMilestone {
  return {
    id,
    projectId: 'p1',
    name: id,
    position: 0,
    dependsOn: [],
    done: 0,
    total: 0,
    tasks: [],
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}

describe('milestoneNodeHeight', () => {
  it('is the fixed collapsed height when not expanded, regardless of task count', () => {
    const m = milestone('a', { tasks: [{ id: 't1', title: 't1', status: 'todo' } as never] });
    expect(milestoneNodeHeight(m, false)).toBe(MILESTONE_GRAPH_COLLAPSED_HEIGHT);
  });

  it('grows with task count when expanded', () => {
    const empty = milestone('a', { tasks: [] });
    const withTasks = milestone('a', {
      tasks: Array.from({ length: 3 }, (_, i) => ({ id: `t${i}`, title: `t${i}`, status: 'todo' }) as never),
    });
    expect(milestoneNodeHeight(withTasks, true)).toBeGreaterThan(milestoneNodeHeight(empty, true));
  });

  it('caps the expanded height for a milestone with many tasks', () => {
    const huge = milestone('a', {
      tasks: Array.from({ length: 200 }, (_, i) => ({ id: `t${i}`, title: `t${i}`, status: 'todo' }) as never),
    });
    expect(milestoneNodeHeight(huge, true)).toBeLessThan(1000);
  });
});

describe('layoutMilestoneGraph', () => {
  it('positions every node with a numeric x/y and marks them non-draggable, connectable', () => {
    const { nodes } = layoutMilestoneGraph([milestone('a'), milestone('b', { dependsOn: ['a'] })], new Set());
    expect(nodes).toHaveLength(2);
    for (const n of nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
      expect(n.type).toBe('milestone');
      expect(n.draggable).toBe(false);
      expect(n.connectable).toBe(true);
    }
  });

  it('ranks a blocker left of its dependent (LR)', () => {
    // b depends on a → a is the blocker and sits upstream (smaller x).
    const { nodes } = layoutMilestoneGraph([milestone('a'), milestone('b', { dependsOn: ['a'] })], new Set());
    const a = nodes.find((n) => n.id === 'a')!;
    const b = nodes.find((n) => n.id === 'b')!;
    expect(a.position.x).toBeLessThan(b.position.x);
  });

  it('builds one edge per dependsOn entry, source = blocker, target = dependent', () => {
    const { edges } = layoutMilestoneGraph([milestone('a'), milestone('b', { dependsOn: ['a'] })], new Set());
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 'a', target: 'b' });
  });

  it('drops an edge whose blocker id is outside the milestone set', () => {
    const { edges } = layoutMilestoneGraph([milestone('b', { dependsOn: ['missing'] })], new Set());
    expect(edges).toHaveLength(0);
  });

  it('reserves more same-rank vertical space for an expanded node', () => {
    // No edges between them → dagre places both in the same rank, separated
    // vertically by nodesep + their heights. Expanding 'a' grows its box, which
    // should push 'b' (below it) further down.
    const siblings = [
      milestone('a', { tasks: Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, title: `t${i}`, status: 'todo' }) as never) }),
      milestone('b'),
    ];
    const collapsedGap = gapBetween(layoutMilestoneGraph(siblings, new Set()));
    const expandedGap = gapBetween(layoutMilestoneGraph(siblings, new Set(['a'])));
    expect(expandedGap).toBeGreaterThan(collapsedGap);

    function gapBetween(graph: ReturnType<typeof layoutMilestoneGraph>): number {
      const a = graph.nodes.find((n) => n.id === 'a')!;
      const b = graph.nodes.find((n) => n.id === 'b')!;
      return Math.abs(b.position.y - a.position.y);
    }
  });
});
