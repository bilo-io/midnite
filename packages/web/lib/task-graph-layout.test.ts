import { describe, expect, it } from 'vitest';
import type { TaskGraph } from '@midnite/shared';
import { layoutTaskGraph } from './task-graph-layout';

function node(id: string, over: Partial<TaskGraph['nodes'][number]> = {}): TaskGraph['nodes'][number] {
  return {
    id,
    title: id,
    status: 'todo',
    priority: 1,
    ready: true,
    unmetBlockerCount: 0,
    ...over,
  };
}

const base = { truncated: false, totalCount: 0 };

describe('layoutTaskGraph', () => {
  it('positions every node with a numeric x/y', () => {
    const graph: TaskGraph = {
      ...base,
      nodes: [node('a'), node('b')],
      edges: [{ from: 'b', to: 'a' }],
    };
    const { nodes } = layoutTaskGraph(graph);
    expect(nodes).toHaveLength(2);
    for (const n of nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
      expect(n.type).toBe('task');
      expect(n.draggable).toBe(false);
    }
  });

  it('ranks a blocker left of its dependent (LR)', () => {
    // b depends on a (edge from=b → to=a), so a is the blocker and sits upstream.
    const graph: TaskGraph = {
      ...base,
      nodes: [node('a'), node('b')],
      edges: [{ from: 'b', to: 'a' }],
    };
    const { nodes } = layoutTaskGraph(graph);
    const a = nodes.find((n) => n.id === 'a')!;
    const b = nodes.find((n) => n.id === 'b')!;
    expect(a.position.x).toBeLessThan(b.position.x);
  });

  it('draws an in-progress blocker → blocked dependent as an animated orange edge', () => {
    const graph: TaskGraph = {
      ...base,
      nodes: [node('a', { status: 'wip' }), node('b', { ready: false, unmetBlockerCount: 1 })],
      edges: [{ from: 'b', to: 'a' }],
    };
    const { edges } = layoutTaskGraph(graph);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: 'a', target: 'b', animated: true });
    expect(edges[0]?.style).toMatchObject({ stroke: 'hsl(var(--status-wip))', strokeDasharray: '6 4' });
  });

  it('draws a done blocker → unblocked dependent as an animated green dotted edge', () => {
    const graph: TaskGraph = {
      ...base,
      nodes: [node('a', { status: 'done' }), node('b')],
      edges: [{ from: 'b', to: 'a' }],
    };
    const { edges } = layoutTaskGraph(graph);
    expect(edges[0]).toMatchObject({ animated: true });
    expect(edges[0]?.style).toMatchObject({ stroke: 'hsl(var(--status-done))', strokeDasharray: '6 4' });
  });

  it('draws a fully-complete dependency as a solid, thicker green edge', () => {
    const graph: TaskGraph = {
      ...base,
      nodes: [node('a', { status: 'done' }), node('b', { status: 'done' })],
      edges: [{ from: 'b', to: 'a' }],
    };
    const { edges } = layoutTaskGraph(graph);
    expect(edges[0]?.animated).toBe(false);
    expect(edges[0]?.style).toMatchObject({ stroke: 'hsl(var(--status-done))', strokeWidth: 2.5 });
    expect(edges[0]?.style).not.toHaveProperty('strokeDasharray');
  });

  it('draws a quiet, not-yet-started dependency as a static white edge', () => {
    const graph: TaskGraph = {
      ...base,
      nodes: [node('a', { status: 'todo' }), node('b', { status: 'todo' })],
      edges: [{ from: 'b', to: 'a' }],
    };
    const { edges } = layoutTaskGraph(graph);
    expect(edges[0]?.animated).toBe(false);
    expect(edges[0]?.style).toMatchObject({ stroke: 'hsl(var(--foreground))' });
  });

  it('drops edges with an endpoint outside the node set (capped graph)', () => {
    const graph: TaskGraph = {
      ...base,
      nodes: [node('a')],
      edges: [{ from: 'a', to: 'missing' }],
    };
    const { edges } = layoutTaskGraph(graph);
    expect(edges).toHaveLength(0);
  });
});
