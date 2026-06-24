import { describe, expect, it } from 'vitest';
import type { Task } from '@midnite/shared';

import {
  blockedCounts,
  dependentsOf,
  isBlockerSatisfied,
  unmetBlockerCount,
  unmetBlockerIds,
} from './task-dependencies';

function task(id: string, over: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    status: 'todo',
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    events: [],
    ...over,
  };
}

// A → B → C: C blocks B, B blocks A (A.dependsOn=[B], B.dependsOn=[C]).
const c = task('C', { status: 'todo' });
const b = task('B', { status: 'todo', dependsOn: ['C'] });
const a = task('A', { dependsOn: ['B'] });

describe('isBlockerSatisfied', () => {
  it('is true only for a done blocker', () => {
    expect(isBlockerSatisfied(task('x', { status: 'done' }))).toBe(true);
    expect(isBlockerSatisfied(task('x', { status: 'wip' }))).toBe(false);
  });

  it('treats a missing (undefined) blocker as unmet', () => {
    expect(isBlockerSatisfied(undefined)).toBe(false);
  });
});

describe('unmetBlockerIds / unmetBlockerCount', () => {
  const byId = new Map([a, b, c].map((t) => [t.id, t] as const));

  it('counts a not-done blocker as unmet', () => {
    expect(unmetBlockerIds(a, byId)).toEqual(['B']);
    expect(unmetBlockerCount(a, byId)).toBe(1);
  });

  it('counts a missing blocker as unmet', () => {
    const orphan = task('O', { dependsOn: ['ghost'] });
    const m = new Map([[orphan.id, orphan] as const]);
    expect(unmetBlockerIds(orphan, m)).toEqual(['ghost']);
  });

  it('treats a done blocker as met', () => {
    const doneC = task('C', { status: 'done' });
    const m = new Map([b, doneC].map((t) => [t.id, t] as const));
    expect(unmetBlockerCount(b, m)).toBe(0);
  });

  it('returns empty for a task with no dependsOn', () => {
    expect(unmetBlockerIds(c, byId)).toEqual([]);
    expect(unmetBlockerCount(c, byId)).toBe(0);
  });
});

describe('blockedCounts', () => {
  it('maps every task id to its unmet-blocker count', () => {
    const counts = blockedCounts([a, b, c]);
    expect(counts.get('A')).toBe(1); // B not done
    expect(counts.get('B')).toBe(1); // C not done
    expect(counts.get('C')).toBe(0); // no blockers
  });

  it('drops a blocker once it is done (chain unblocks one level)', () => {
    const doneC = task('C', { status: 'done' });
    const counts = blockedCounts([a, b, doneC]);
    expect(counts.get('B')).toBe(0); // C done → B ready
    expect(counts.get('A')).toBe(1); // B still not done
  });
});

describe('dependentsOf', () => {
  it('finds the tasks blocked by a given task', () => {
    expect(dependentsOf('C', [a, b, c]).map((t) => t.id)).toEqual(['B']);
    expect(dependentsOf('B', [a, b, c]).map((t) => t.id)).toEqual(['A']);
  });

  it('returns empty when nothing depends on the task', () => {
    expect(dependentsOf('A', [a, b, c])).toEqual([]);
  });
});
