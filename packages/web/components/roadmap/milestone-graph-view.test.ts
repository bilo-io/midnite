import { describe, expect, it } from 'vitest';
import type { RoadmapView } from '@midnite/shared';
import { addDependencyLocal, removeDependenciesLocal, renameMilestoneLocal } from './milestone-graph-view';

function view(): RoadmapView {
  return {
    projectId: 'p1',
    milestones: [
      { id: 'a', projectId: 'p1', name: 'A', position: 0, dependsOn: [], createdAt: '', updatedAt: '', done: 0, total: 0, tasks: [] },
      { id: 'b', projectId: 'p1', name: 'B', position: 1, dependsOn: ['a'], createdAt: '', updatedAt: '', done: 0, total: 0, tasks: [] },
      { id: 'c', projectId: 'p1', name: 'C', position: 2, dependsOn: ['a', 'b'], createdAt: '', updatedAt: '', done: 0, total: 0, tasks: [] },
    ],
    backlog: [],
  };
}

describe('renameMilestoneLocal', () => {
  it('renames only the targeted milestone', () => {
    const next = renameMilestoneLocal(view(), 'b', 'Renamed');
    expect(next.milestones.find((m) => m.id === 'b')?.name).toBe('Renamed');
    expect(next.milestones.find((m) => m.id === 'a')?.name).toBe('A');
  });
});

describe('addDependencyLocal', () => {
  it('appends a new blocker id to dependsOn', () => {
    const next = addDependencyLocal(view(), 'a', 'c');
    expect(next.milestones.find((m) => m.id === 'a')?.dependsOn).toEqual(['c']);
  });

  it('is a no-op when the edge already exists', () => {
    const next = addDependencyLocal(view(), 'b', 'a');
    expect(next.milestones.find((m) => m.id === 'b')?.dependsOn).toEqual(['a']);
  });
});

describe('removeDependenciesLocal', () => {
  it('removes only the matching edges, keyed by target', () => {
    const next = removeDependenciesLocal(view(), [{ source: 'a', target: 'c' }]);
    expect(next.milestones.find((m) => m.id === 'c')?.dependsOn).toEqual(['b']);
    expect(next.milestones.find((m) => m.id === 'b')?.dependsOn).toEqual(['a']); // untouched
  });

  it('removes multiple edges into the same target in one call', () => {
    const next = removeDependenciesLocal(view(), [
      { source: 'a', target: 'c' },
      { source: 'b', target: 'c' },
    ]);
    expect(next.milestones.find((m) => m.id === 'c')?.dependsOn).toEqual([]);
  });

  it('is a no-op for an edge that does not exist', () => {
    const next = removeDependenciesLocal(view(), [{ source: 'zzz', target: 'c' }]);
    expect(next.milestones.find((m) => m.id === 'c')?.dependsOn).toEqual(['a', 'b']);
  });
});
