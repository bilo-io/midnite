import type { WorkflowGraph } from '@midnite/shared';

export class CyclicWorkflowError extends Error {
  constructor() {
    super('workflow graph contains a cycle');
    this.name = 'CyclicWorkflowError';
  }
}

/**
 * Kahn topological sort over the whole graph. Throws CyclicWorkflowError if the
 * graph is not a DAG. Dangling edges (referencing missing nodes) are ignored.
 */
export function topologicalOrder(graph: WorkflowGraph): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of graph.edges) {
    if (!adj.has(e.source) || !inDegree.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, d] of inDegree) if (d === 0) queue.push(id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  if (order.length !== graph.nodes.length) throw new CyclicWorkflowError();
  return order;
}

/** Node ids reachable from `startId` by following outgoing edges (inclusive). */
export function reachableFrom(graph: WorkflowGraph, startId: string): Set<string> {
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const e of graph.edges) adj.get(e.source)?.push(e.target);
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adj.get(id) ?? []) stack.push(next);
  }
  return seen;
}

/** Source node ids with an edge into `nodeId`. */
export function predecessors(graph: WorkflowGraph, nodeId: string): string[] {
  return graph.edges.filter((e) => e.target === nodeId).map((e) => e.source);
}
