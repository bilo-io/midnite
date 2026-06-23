import { describe, expect, it } from 'vitest';

import { applyTaskEvent } from './task-board-reducer.js';
import type { TaskBoardEvent } from './events/task.js';
import type { Task } from './task.js';

function task(id: string, over: Partial<Task> = {}): Task {
  return {
    id,
    priority: 1,
    retryCount: 0,
    title: `Task ${id}`,
    kind: 'feature',
    status: 'todo',
    projectId: 'p1',
    tags: [],
    events: [],
    ...over,
  };
}

const AT = '2026-06-23T12:00:00.000Z';
const created = (t: Task): TaskBoardEvent => ({ type: 'task.created', at: AT, task: t });
const updated = (t: Task): TaskBoardEvent => ({ type: 'task.updated', at: AT, task: t });
const deleted = (id: string): TaskBoardEvent => ({ type: 'task.deleted', at: AT, id });

describe('applyTaskEvent', () => {
  it('appends a created task', () => {
    const board = [task('a')];
    const next = applyTaskEvent(board, created(task('b')));
    expect(next?.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('upserts a created task by id (no duplicate on re-delivery)', () => {
    const board = [task('a', { title: 'old' })];
    const next = applyTaskEvent(board, created(task('a', { title: 'new' })));
    expect(next).toHaveLength(1);
    expect(next?.[0]?.title).toBe('new');
  });

  it('replaces an updated task in place, preserving order', () => {
    const board = [task('a'), task('b'), task('c')];
    const next = applyTaskEvent(board, updated(task('b', { status: 'done' })));
    expect(next?.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(next?.[1]?.status).toBe('done');
  });

  it('upserts an updated task whose id is not yet on the board', () => {
    const board = [task('a')];
    const next = applyTaskEvent(board, updated(task('z')));
    expect(next?.map((t) => t.id)).toEqual(['a', 'z']);
  });

  it('removes a deleted task', () => {
    const board = [task('a'), task('b')];
    const next = applyTaskEvent(board, deleted('a'));
    expect(next?.map((t) => t.id)).toEqual(['b']);
  });

  it('is a no-op delete when the id is absent', () => {
    const board = [task('a')];
    const next = applyTaskEvent(board, deleted('missing'));
    expect(next?.map((t) => t.id)).toEqual(['a']);
  });

  it('signals a reseed (null) for tasks.bulkCreated — only ids in the payload', () => {
    const board = [task('a')];
    expect(applyTaskEvent(board, { type: 'tasks.bulkCreated', at: AT, taskIds: ['b', 'c'] })).toBeNull();
  });

  it('stays null for patch events when the board has not been seeded', () => {
    expect(applyTaskEvent(null, created(task('a')))).toBeNull();
    expect(applyTaskEvent(null, updated(task('a')))).toBeNull();
    expect(applyTaskEvent(null, deleted('a'))).toBeNull();
  });

  it('never mutates the input board', () => {
    const board = [task('a'), task('b')];
    const snapshot = JSON.stringify(board);
    applyTaskEvent(board, created(task('c')));
    applyTaskEvent(board, updated(task('a', { status: 'done' })));
    applyTaskEvent(board, deleted('a'));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});
