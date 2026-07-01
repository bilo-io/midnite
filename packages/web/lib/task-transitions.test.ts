import { beforeEach, describe, expect, it, vi } from 'vitest';

const startTask = vi.fn();
const stopTask = vi.fn();
const updateTaskStatus = vi.fn();
vi.mock('@/lib/api', () => ({
  startTask: (...a: unknown[]) => startTask(...a),
  stopTask: (...a: unknown[]) => stopTask(...a),
  updateTaskStatus: (...a: unknown[]) => updateTaskStatus(...a),
}));

import { moveTask, spawnsSession, stopsSession } from './task-transitions';

beforeEach(() => vi.clearAllMocks());

describe('spawnsSession / stopsSession', () => {
  it('spawns only on todo/backlog → wip', () => {
    expect(spawnsSession('todo', 'wip')).toBe(true);
    expect(spawnsSession('backlog', 'wip')).toBe(true);
    expect(spawnsSession('waiting', 'wip')).toBe(false);
    expect(spawnsSession('todo', 'done')).toBe(false);
  });

  it('stops only on wip/waiting → todo/backlog', () => {
    expect(stopsSession('wip', 'todo')).toBe(true);
    expect(stopsSession('waiting', 'backlog')).toBe(true);
    expect(stopsSession('wip', 'done')).toBe(false);
    expect(stopsSession('todo', 'backlog')).toBe(false);
  });
});

describe('moveTask routing', () => {
  it('starts a session for todo → wip', async () => {
    await moveTask('todo', 'wip', 't1');
    expect(startTask).toHaveBeenCalledWith('t1');
    expect(stopTask).not.toHaveBeenCalled();
    expect(updateTaskStatus).not.toHaveBeenCalled();
  });

  it('stops a session for wip → todo (passing the target column)', async () => {
    await moveTask('wip', 'todo', 't2');
    expect(stopTask).toHaveBeenCalledWith('t2', 'todo');
    expect(startTask).not.toHaveBeenCalled();
  });

  it('falls back to updateTaskStatus for everything else (e.g. wip → done)', async () => {
    await moveTask('wip', 'done', 't3');
    expect(updateTaskStatus).toHaveBeenCalledWith('t3', 'done');
    expect(startTask).not.toHaveBeenCalled();
    expect(stopTask).not.toHaveBeenCalled();
  });
});
