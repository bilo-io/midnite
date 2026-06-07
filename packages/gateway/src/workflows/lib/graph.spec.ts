import { describe, expect, it } from 'vitest';
import type { WorkflowGraph } from '@midnite/shared';
import { CyclicWorkflowError, predecessors, reachableFrom, topologicalOrder } from './graph';

function graph(ids: string[], edges: Array<[string, string]>): WorkflowGraph {
  return {
    nodes: ids.map((id) => ({ id, type: 'x', position: { x: 0, y: 0 }, params: {} })),
    edges: edges.map(([source, target], i) => ({
      id: `e${i}`,
      source,
      sourcePort: 'main',
      target,
      targetPort: 'main',
    })),
  };
}

describe('topologicalOrder', () => {
  it('orders a linear chain trigger → a → b', () => {
    const order = topologicalOrder(graph(['t', 'a', 'b'], [['t', 'a'], ['a', 'b']]));
    expect(order.indexOf('t')).toBeLessThan(order.indexOf('a'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
  });

  it('throws on a cycle', () => {
    expect(() => topologicalOrder(graph(['a', 'b'], [['a', 'b'], ['b', 'a']]))).toThrow(
      CyclicWorkflowError,
    );
  });
});

describe('reachableFrom', () => {
  it('only includes downstream nodes', () => {
    const g = graph(['t', 'a', 'b', 'orphan'], [['t', 'a'], ['a', 'b']]);
    const seen = reachableFrom(g, 't');
    expect([...seen].sort()).toEqual(['a', 'b', 't']);
    expect(seen.has('orphan')).toBe(false);
  });
});

describe('predecessors', () => {
  it('returns sources of edges into a node', () => {
    const g = graph(['a', 'b', 'c'], [['a', 'c'], ['b', 'c']]);
    expect(predecessors(g, 'c').sort()).toEqual(['a', 'b']);
  });
});
