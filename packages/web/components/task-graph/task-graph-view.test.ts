import { describe, expect, it } from 'vitest';
import type { TaskGraph } from '@midnite/shared';
import { addTaskDependencyLocal, removeTaskDependenciesLocal } from './task-graph-view';

function graph(): TaskGraph {
  return {
    nodes: [
      { id: 'a', title: 'A', status: 'todo', priority: 1, ready: true, unmetBlockerCount: 0 },
      { id: 'b', title: 'B', status: 'todo', priority: 1, ready: false, unmetBlockerCount: 1 },
      { id: 'c', title: 'C', status: 'todo', priority: 1, ready: false, unmetBlockerCount: 2 },
    ],
    edges: [
      { from: 'b', to: 'a' },
      { from: 'c', to: 'a' },
      { from: 'c', to: 'b' },
    ],
    truncated: false,
    totalCount: 3,
  };
}

describe('addTaskDependencyLocal', () => {
  it('appends a new blocker edge', () => {
    const next = addTaskDependencyLocal(graph(), 'a', 'c');
    expect(next.edges).toContainEqual({ from: 'a', to: 'c' });
  });

  it('is a no-op when the edge already exists', () => {
    const next = addTaskDependencyLocal(graph(), 'b', 'a');
    expect(next.edges).toEqual(graph().edges);
  });
});

describe('removeTaskDependenciesLocal', () => {
  it('removes only the matching edges, keyed by React Flow source/target', () => {
    // React Flow edge: source = blocker (`to`), target = dependent (`from`).
    const next = removeTaskDependenciesLocal(graph(), [{ source: 'a', target: 'c' }]);
    expect(next.edges).toEqual([
      { from: 'b', to: 'a' },
      { from: 'c', to: 'b' },
    ]);
  });

  it('leaves the graph untouched when nothing matches', () => {
    const next = removeTaskDependenciesLocal(graph(), [{ source: 'x', target: 'y' }]);
    expect(next.edges).toEqual(graph().edges);
  });
});
