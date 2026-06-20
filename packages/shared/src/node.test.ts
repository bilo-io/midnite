import { describe, expect, it } from 'vitest';
import { WorkflowEdgeSchema, WorkflowGraphSchema, WorkflowNodeSchema } from './node.js';

describe('WorkflowNodeSchema', () => {
  it('defaults params to an empty object', () => {
    const parsed = WorkflowNodeSchema.parse({
      id: 'n1',
      type: 'http.request',
      position: { x: 10, y: 20 },
    });
    expect(parsed.params).toEqual({});
  });

  it('rejects a missing position', () => {
    expect(WorkflowNodeSchema.safeParse({ id: 'n1', type: 'manual' }).success).toBe(false);
  });
});

describe('WorkflowEdgeSchema', () => {
  it('defaults source/target ports to main', () => {
    const parsed = WorkflowEdgeSchema.parse({ id: 'e1', source: 'a', target: 'b' });
    expect(parsed.sourcePort).toBe('main');
    expect(parsed.targetPort).toBe('main');
  });
});

describe('WorkflowGraphSchema', () => {
  it('defaults nodes and edges to empty arrays', () => {
    expect(WorkflowGraphSchema.parse({})).toEqual({ nodes: [], edges: [] });
  });

  it('round-trips a one-edge graph', () => {
    const graph = {
      nodes: [
        { id: 'a', type: 'manual', position: { x: 0, y: 0 }, params: {} },
        { id: 'b', type: 'ai.claude', position: { x: 1, y: 1 }, params: {} },
      ],
      edges: [{ id: 'e', source: 'a', sourcePort: 'main', target: 'b', targetPort: 'main' }],
    };
    expect(WorkflowGraphSchema.parse(graph)).toEqual(graph);
  });
});
