import { describe, expect, it, vi } from 'vitest';
import type { TaskSummary } from '@midnite/shared';
import type { NodeRunContext } from '../node-executor';
import type { CompletedTasksQuery, TaskReader } from '../../../tasks/task-reader';
import { ListCompletedTasksExecutor } from './list-completed-tasks.executor';

function ctx(params: Record<string, unknown>): NodeRunContext {
  return { workflowId: 'w1', workflowCreatedBy: 'u1', input: {}, params, signal: new AbortController().signal, log: () => {} };
}

function make(rows: TaskSummary[] = []) {
  const listCompleted = vi.fn((_q: CompletedTasksQuery) => rows);
  const tasks: TaskReader = { getTask: vi.fn(), listCompleted };
  return { exec: new ListCompletedTasksExecutor(tasks), listCompleted };
}

describe('ListCompletedTasksExecutor', () => {
  it('derives a trailing window from sinceHours and passes filters through', async () => {
    const { exec, listCompleted } = make([]);
    await exec.execute(ctx({ sinceHours: 24, repo: 'midnite', projectId: 'p1' }));
    const q = listCompleted.mock.calls[0]![0] as CompletedTasksQuery;
    expect(q.repo).toBe('midnite');
    expect(q.projectId).toBe('p1');
    expect(Date.parse(q.to) - Date.parse(q.from)).toBe(24 * 3600_000);
  });

  it('honours an explicit from/to window', async () => {
    const { exec, listCompleted } = make([]);
    await exec.execute(ctx({ from: '2026-07-01T00:00:00.000Z', to: '2026-07-02T00:00:00.000Z' }));
    const q = listCompleted.mock.calls[0]![0] as CompletedTasksQuery;
    expect(q.from).toBe('2026-07-01T00:00:00.000Z');
    expect(q.to).toBe('2026-07-02T00:00:00.000Z');
  });

  it('returns the tasks + count + window', async () => {
    const rows = [{ id: 't1', title: 'a', status: 'done', priority: 1, retryCount: 0, tags: [] }] as TaskSummary[];
    const { exec } = make(rows);
    const out = (await exec.execute(ctx({}))) as { tasks: TaskSummary[]; count: number; window: unknown };
    expect(out.count).toBe(1);
    expect(out.tasks).toEqual(rows);
    expect(out.window).toBeDefined();
  });
});
