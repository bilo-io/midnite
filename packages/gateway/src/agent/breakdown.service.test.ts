import { describe, expect, it } from 'vitest';

import { pruneBreakdown } from './breakdown.service';

describe('pruneBreakdown', () => {
  it('passes a clean breakdown through unchanged', () => {
    const result = pruneBreakdown({
      tasks: [
        { ref: 'a', title: 'A', dependsOn: [] },
        { ref: 'b', title: 'B', dependsOn: ['a'] },
        { ref: 'c', title: 'C', dependsOn: ['b'] },
      ],
    });
    expect(result.tasks.map((t) => t.ref)).toEqual(['a', 'b', 'c']);
    expect(result.tasks[1]!.dependsOn).toEqual(['a']);
    expect(result.tasks[2]!.dependsOn).toEqual(['b']);
  });

  it('removes self-references', () => {
    const result = pruneBreakdown({
      tasks: [{ ref: 'a', title: 'A', dependsOn: ['a'] }],
    });
    expect(result.tasks[0]!.dependsOn).toEqual([]);
  });

  it('removes references to unknown refs', () => {
    const result = pruneBreakdown({
      tasks: [{ ref: 'a', title: 'A', dependsOn: ['missing'] }],
    });
    expect(result.tasks[0]!.dependsOn).toEqual([]);
  });

  it('removes cycle-creating edges (direct cycle)', () => {
    const result = pruneBreakdown({
      tasks: [
        { ref: 'a', title: 'A', dependsOn: ['b'] },
        { ref: 'b', title: 'B', dependsOn: ['a'] },
      ],
    });
    // First valid edge (a→b) is kept; second (b→a) would close a cycle, so dropped.
    expect(result.tasks[0]!.dependsOn).toEqual(['b']);
    expect(result.tasks[1]!.dependsOn).toEqual([]);
  });

  it('removes cycle-creating edges (transitive cycle)', () => {
    const result = pruneBreakdown({
      tasks: [
        { ref: 'a', title: 'A', dependsOn: [] },
        { ref: 'b', title: 'B', dependsOn: ['a'] },
        { ref: 'c', title: 'C', dependsOn: ['b', 'a'] },
        // a depending on c would close a→b→c cycle
        { ref: 'x', title: 'X', dependsOn: ['c'] },
      ],
    });
    expect(result.tasks[1]!.dependsOn).toEqual(['a']);
    expect(result.tasks[2]!.dependsOn).toContain('b');
    expect(result.tasks[3]!.dependsOn).toEqual(['c']);
  });

  it('deduplicates refs (first wins)', () => {
    const result = pruneBreakdown({
      tasks: [
        { ref: 'a', title: 'A first', dependsOn: [] },
        { ref: 'a', title: 'A duplicate', dependsOn: [] },
        { ref: 'b', title: 'B', dependsOn: ['a'] },
      ],
    });
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0]!.title).toBe('A first');
  });
});
