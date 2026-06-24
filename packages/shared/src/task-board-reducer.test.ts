import { describe, expect, it } from 'vitest';
import type { Task } from './task.js';
import { applyTaskEvent } from './task-board-reducer.js';

const AT = '2026-06-23T10:00:00.000Z';

function t(id: string, status: Task['status'] = 'todo'): Task {
  return {
    id,
    title: `task-${id}`,
    status,
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    dependsOn: [],
    events: [],
  } as unknown as Task;
}

describe('applyTaskEvent', () => {
  describe('task.created', () => {
    it('appends a new task', () => {
      const result = applyTaskEvent([t('a')], { type: 'task.created', at: AT, task: t('b') });
      expect(result).toHaveLength(2);
      expect(result?.find((x) => x.id === 'b')).toBeDefined();
    });

    it('deduplicates: updates existing task if id matches (race condition)', () => {
      const updated = { ...t('a'), title: 'updated' };
      const result = applyTaskEvent([t('a')], { type: 'task.created', at: AT, task: updated });
      expect(result).toHaveLength(1);
      expect(result?.[0]?.title).toBe('updated');
    });
  });

  describe('task.updated', () => {
    it('replaces the matching task in place', () => {
      const updated = { ...t('a'), status: 'wip' as const };
      const result = applyTaskEvent([t('a'), t('b')], { type: 'task.updated', at: AT, task: updated });
      expect(result).toHaveLength(2);
      expect(result?.find((x) => x.id === 'a')?.status).toBe('wip');
      expect(result?.find((x) => x.id === 'b')).toBeDefined();
    });

    it('is a no-op when the task id is not in the board', () => {
      const result = applyTaskEvent([t('a')], { type: 'task.updated', at: AT, task: t('z') });
      expect(result).toHaveLength(1);
      expect(result?.[0]?.id).toBe('a');
    });
  });

  describe('task.deleted', () => {
    it('removes the matching task', () => {
      const result = applyTaskEvent([t('a'), t('b')], { type: 'task.deleted', at: AT, id: 'a' });
      expect(result).toHaveLength(1);
      expect(result?.[0]?.id).toBe('b');
    });

    it('is a no-op when the id is not present', () => {
      const result = applyTaskEvent([t('a')], { type: 'task.deleted', at: AT, id: 'z' });
      expect(result).toHaveLength(1);
    });
  });

  describe('tasks.bulkCreated', () => {
    it('returns null to signal a refetch is needed', () => {
      const result = applyTaskEvent([t('a')], { type: 'tasks.bulkCreated', at: AT, taskIds: ['b', 'c'] });
      expect(result).toBeNull();
    });
  });

  it('never mutates the input array', () => {
    const board = [t('a')];
    const copy = [...board];
    applyTaskEvent(board, { type: 'task.created', at: AT, task: t('b') });
    expect(board).toEqual(copy);
  });
});
