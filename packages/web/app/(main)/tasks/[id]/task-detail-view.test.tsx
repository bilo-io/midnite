import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Task } from '@midnite/shared';

const push = vi.fn();
let searchId = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(searchId ? `id=${searchId}` : ''),
}));

const getTask = vi.fn();
const getProjects = vi.fn();
const getTasks = vi.fn();
vi.mock('@/lib/api', () => ({
  getTask: (...a: unknown[]) => getTask(...a),
  getProjects: (...a: unknown[]) => getProjects(...a),
  getTasks: (...a: unknown[]) => getTasks(...a),
}));

// Stub the shared detail body — this spec covers the page's own routing / fetch
// / not-found logic, not the (separately tested) <TaskDetail> internals.
vi.mock('@/components/task-detail', () => ({
  TaskDetail: ({ task }: { task: Task }) => <div data-testid="task-detail">{task.title}</div>,
}));

import { TaskDetailView } from './task-detail-view';
import { withQueryClient } from '@/lib/test-query-wrapper';

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Seeded task',
    status: 'todo',
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    events: [],
    ...over,
  };
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  searchId = 't1';
  getProjects.mockResolvedValue([]);
  getTasks.mockResolvedValue([]);
});

describe('TaskDetailView', () => {
  it('renders the full detail for the id in the query string', async () => {
    getTask.mockResolvedValue(task({ title: 'My shareable task' }));
    render(withQueryClient(<TaskDetailView />));

    expect(await screen.findByTestId('task-detail')).toHaveTextContent('My shareable task');
    expect(getTask).toHaveBeenCalledWith('t1');
  });

  it('shows an inline not-found when the task fetch fails', async () => {
    getTask.mockRejectedValue(new Error('404'));
    render(withQueryClient(<TaskDetailView />));

    expect(await screen.findByText('Task not found.')).toBeInTheDocument();
  });

  it('shows not-found when no id is supplied', async () => {
    searchId = '';
    render(withQueryClient(<TaskDetailView />));

    expect(await screen.findByText('Task not found.')).toBeInTheDocument();
    expect(getTask).not.toHaveBeenCalled();
  });
});
