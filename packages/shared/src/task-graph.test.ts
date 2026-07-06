import { describe, expect, it } from 'vitest';
import { TaskGraphSchema, TaskGraphResponseSchema, TASK_GRAPH_NODE_CAP } from './task-graph.js';

describe('TaskGraphSchema', () => {
  it('round-trips a graph with nodes + edges', () => {
    const graph = {
      nodes: [
        { id: 'a', title: 'A', status: 'done', priority: 1, ready: false, unmetBlockerCount: 0 },
        {
          id: 'b',
          title: 'B',
          status: 'todo',
          priority: 2,
          ready: true,
          unmetBlockerCount: 0,
          projectId: 'p1',
        },
        { id: 'x', title: 'X', status: 'wip', priority: 1, ready: false, unmetBlockerCount: 1, foreign: true },
      ],
      edges: [{ from: 'b', to: 'a' }],
      truncated: false,
      totalCount: 2,
    };
    expect(TaskGraphSchema.parse(graph)).toEqual(graph);
    expect(TaskGraphResponseSchema.parse({ graph }).graph.nodes).toHaveLength(3);
  });

  it('rejects an unknown status on a node', () => {
    const bad = {
      nodes: [{ id: 'a', title: 'A', status: 'nope', priority: 1, ready: false, unmetBlockerCount: 0 }],
      edges: [],
      truncated: false,
      totalCount: 1,
    };
    expect(TaskGraphSchema.safeParse(bad).success).toBe(false);
  });

  it('exposes a positive node cap', () => {
    expect(TASK_GRAPH_NODE_CAP).toBeGreaterThan(0);
  });
});
