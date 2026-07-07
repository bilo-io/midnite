import { describe, expect, it } from 'vitest';
import type { RoadmapView, TaskSummary } from '@midnite/shared';
import { moveTaskLocal } from './roadmap-board';

function task(id: string, status: TaskSummary['status'] = 'todo', milestoneId?: string): TaskSummary {
  return { id, title: id, status, priority: 1, retryCount: 0, tags: [], milestoneId };
}

function view(): RoadmapView {
  return {
    projectId: 'p1',
    milestones: [
      { id: 'm1', projectId: 'p1', name: 'M1', position: 0, createdAt: '', updatedAt: '', done: 1, total: 2, tasks: [task('a', 'done', 'm1'), task('b', 'todo', 'm1')] },
      { id: 'm2', projectId: 'p1', name: 'M2', position: 1, createdAt: '', updatedAt: '', done: 0, total: 0, tasks: [] },
    ],
    backlog: [task('c', 'todo')],
  };
}

describe('moveTaskLocal', () => {
  it('moves a task between milestones and recomputes done/total', () => {
    const next = moveTaskLocal(view(), 'a', 'm2')!;
    const m1 = next.milestones.find((m) => m.id === 'm1')!;
    const m2 = next.milestones.find((m) => m.id === 'm2')!;
    expect(m1.tasks.map((t) => t.id)).toEqual(['b']);
    expect(m1).toMatchObject({ done: 0, total: 1 });
    expect(m2.tasks.map((t) => t.id)).toEqual(['a']);
    expect(m2).toMatchObject({ done: 1, total: 1 }); // 'a' is done
    expect(m2.tasks[0]!.milestoneId).toBe('m2');
  });

  it('moves a backlog task into a milestone', () => {
    const next = moveTaskLocal(view(), 'c', 'm2')!;
    expect(next.backlog.map((t) => t.id)).toEqual([]);
    expect(next.milestones.find((m) => m.id === 'm2')!.tasks.map((t) => t.id)).toEqual(['c']);
  });

  it('unassigns a task to the backlog (target null)', () => {
    const next = moveTaskLocal(view(), 'b', null)!;
    expect(next.backlog.map((t) => t.id).sort()).toEqual(['b', 'c']);
    expect(next.backlog.find((t) => t.id === 'b')!.milestoneId).toBeUndefined();
    expect(next.milestones.find((m) => m.id === 'm1')!.total).toBe(1);
  });

  it('returns null for a no-op (task already in the target lane)', () => {
    expect(moveTaskLocal(view(), 'a', 'm1')).toBeNull();
    expect(moveTaskLocal(view(), 'c', null)).toBeNull();
  });

  it('returns null when the task is unknown', () => {
    expect(moveTaskLocal(view(), 'zzz', 'm1')).toBeNull();
  });
});
