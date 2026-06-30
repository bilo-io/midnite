import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@midnite/shared';
import type { NodeRunContext } from '../node-executor';
import type { TaskCreator, TaskCreatorInput } from '../../../tasks/task-creator';
import { TaskCreateExecutor } from './task-create.executor';

const fakeTask = (id: string): Task =>
  ({ id, status: 'todo', priority: 1, prompt: 'p' } as unknown as Task);

function ctx(params: Record<string, unknown>, workflowCreatedBy: string | null): NodeRunContext {
  return {
    workflowId: 'w1',
    workflowCreatedBy,
    input: {},
    params,
    signal: new AbortController().signal,
    log: () => {},
  };
}

function make(): { exec: TaskCreateExecutor; createTask: ReturnType<typeof vi.fn> } {
  const createTask = vi.fn(async (_input: TaskCreatorInput) => fakeTask('t1'));
  const creator: TaskCreator = { createTask };
  return { exec: new TaskCreateExecutor(creator), createTask };
}

describe('TaskCreateExecutor', () => {
  it('creates a task from params and returns it', async () => {
    const { exec, createTask } = make();
    const out = await exec.execute(ctx({ prompt: 'Daily standup', repo: 'midnite', priority: 2 }, 'user-1'));

    expect(createTask).toHaveBeenCalledWith({
      prompt: 'Daily standup',
      repo: 'midnite',
      projectId: undefined,
      priority: 2,
      createdBy: 'user-1',
    });
    expect(out).toEqual(fakeTask('t1'));
  });

  it("attributes the task to the workflow's owner (null when unowned)", async () => {
    const { exec, createTask } = make();
    await exec.execute(ctx({ prompt: 'cleanup' }, null));
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ createdBy: null }));
  });

  it('rejects an empty prompt (schema-validated)', async () => {
    const { exec, createTask } = make();
    await expect(exec.execute(ctx({ prompt: '' }, 'user-1'))).rejects.toThrow();
    expect(createTask).not.toHaveBeenCalled();
  });

  it('declares the task.create type id', () => {
    expect(make().exec.typeId).toBe('task.create');
  });
});
