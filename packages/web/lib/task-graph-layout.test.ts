import { describe, expect, it } from 'vitest';
import type { TaskGraph } from '@midnite/shared';
import { layoutTaskGraph, topAlignedViewport, type Rect } from './task-graph-layout';

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

  it('draws a done blocker → unblocked dependent as an animated green dotted edge with a green glow', () => {
    const graph: TaskGraph = {
      ...base,
      // b (default ready: true) has its only blocker a done → b is unblocked.
      nodes: [node('a', { status: 'done' }), node('b', { ready: true })],
      edges: [{ from: 'b', to: 'a' }],
    };
    const { edges } = layoutTaskGraph(graph);
    expect(edges[0]).toMatchObject({ animated: true });
    expect(edges[0]?.style).toMatchObject({ stroke: 'hsl(var(--status-done))', strokeDasharray: '6 4' });
    // The cleared-path glow: a green drop-shadow halo around the stroke.
    expect(edges[0]?.style?.filter).toContain('drop-shadow');
    expect(edges[0]?.style?.filter).toContain('hsl(var(--status-done)');
  });

  it('draws a done blocker → still-blocked dependent as green dotted WITHOUT a glow', () => {
    const graph: TaskGraph = {
      ...base,
      // b is done from a's side but still held by another blocker → not ready.
      nodes: [node('a', { status: 'done' }), node('b', { ready: false, unmetBlockerCount: 1 })],
      edges: [{ from: 'b', to: 'a' }],
    };
    const { edges } = layoutTaskGraph(graph);
    expect(edges[0]?.style).toMatchObject({ stroke: 'hsl(var(--status-done))', strokeDasharray: '6 4' });
    expect(edges[0]?.style?.filter).toBeUndefined();
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

describe('topAlignedViewport', () => {
  const PAD = 24;

  it('pins the graph top edge PAD px below the canvas top', () => {
    const bounds: Rect = { x: 0, y: 0, width: 400, height: 4000 };
    // Tall graph → the given (clamped) zoom leaves it overflowing vertically.
    const vp = topAlignedViewport(bounds, 1000, 0.1, PAD);
    // World y=0 maps to screen y = vp.y + worldY*zoom = PAD → the top sits at PAD.
    expect(vp.y + bounds.y * vp.zoom).toBe(PAD);
    expect(vp.zoom).toBe(0.1);
  });

  it('accounts for a non-zero bounds origin when top-aligning', () => {
    const bounds: Rect = { x: 100, y: 250, width: 400, height: 4000 };
    const vp = topAlignedViewport(bounds, 1000, 0.5, PAD);
    // The graph's own top (world y=250) should land at screen PAD.
    expect(vp.y + bounds.y * vp.zoom).toBeCloseTo(PAD);
  });

  it('centres horizontally when the graph fits the canvas width', () => {
    const bounds: Rect = { x: 0, y: 0, width: 400, height: 4000 };
    const width = 1000;
    const zoom = 1; // scaledWidth 400 <= 1000 - 48 → fits
    const vp = topAlignedViewport(bounds, width, zoom, PAD);
    const scaledWidth = bounds.width * zoom;
    // Left edge of the graph on screen = (width - scaledWidth) / 2.
    expect(vp.x + bounds.x * zoom).toBeCloseTo((width - scaledWidth) / 2);
    // Equal margin either side.
    expect(vp.x).toBeCloseTo(width - scaledWidth - vp.x);
  });

  it('left-aligns (with padding) when the graph overflows the canvas width', () => {
    const bounds: Rect = { x: 0, y: 0, width: 5000, height: 400 };
    const zoom = 1; // scaledWidth 5000 > 1000 - 48 → overflows
    const vp = topAlignedViewport(bounds, 1000, zoom, PAD);
    // The graph's left edge sits at PAD; the rest overflows to the right.
    expect(vp.x + bounds.x * zoom).toBe(PAD);
  });
});
