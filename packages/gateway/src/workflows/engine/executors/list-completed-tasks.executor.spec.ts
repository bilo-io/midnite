import { describe, expect, it, vi } from 'vitest';
import type { TaskSummary } from '@midnite/shared';
import type { NodeRunContext } from '../node-executor';
import type { TaskLister, TerminalTaskQuery } from '../../../tasks/task-lister';
import { ListCompletedTasksExecutor } from './list-completed-tasks.executor';

function ctx(params: Record<string, unknown>): NodeRunContext {
  return {
    workflowId: 'w1',
    workflowCreatedBy: null,
    input: {},
    params,
    signal: new AbortController().signal,
    log: () => {},
  };
}

const sample = (id: string): TaskSummary =>
  ({ id, title: id, status: 'done', priority: 1, retryCount: 0, tags: [] } as TaskSummary);

function make(listTerminal = vi.fn((_q: TerminalTaskQuery) => [sample('a'), sample('b')])) {
  const lister: TaskLister = { listTerminal };
  return { exec: new ListCompletedTasksExecutor(lister), listTerminal };
}

describe('ListCompletedTasksExecutor', () => {
  it('declares the type id', () => {
    expect(make().exec.typeId).toBe('midnite.list-completed-tasks');
  });

  it('queries the trailing window and returns the summaries', async () => {
    const { exec, listTerminal } = make();
    const out = (await exec.execute(ctx({ sinceHours: 48, repo: 'midnite' }))) as {
      count: number;
      tasks: TaskSummary[];
    };
    expect(out.count).toBe(2);
    expect(out.tasks).toHaveLength(2);
    const arg = listTerminal.mock.calls[0]![0];
    expect(arg.repo).toBe('midnite');
    // ~48h window.
    const spanH = (Date.parse(arg.to) - Date.parse(arg.from)) / 3_600_000;
    expect(Math.round(spanH)).toBe(48);
  });

  it('defaults to a 24h window', async () => {
    const { exec, listTerminal } = make();
    await exec.execute(ctx({}));
    const arg = listTerminal.mock.calls[0]![0];
    expect(Math.round((Date.parse(arg.to) - Date.parse(arg.from)) / 3_600_000)).toBe(24);
  });

  it('returns an empty set without error', async () => {
    const { exec } = make(vi.fn(() => []));
    const out = (await exec.execute(ctx({}))) as { count: number; tasks: TaskSummary[] };
    expect(out.count).toBe(0);
    expect(out.tasks).toEqual([]);
  });
});
