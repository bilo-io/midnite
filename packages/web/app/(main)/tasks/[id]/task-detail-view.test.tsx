import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Task } from '@midnite/shared';

const push = vi.fn();
const replace = vi.fn();
let searchId = '';
let searchTab = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => {
    const parts = [];
    if (searchId) parts.push(`id=${searchId}`);
    if (searchTab) parts.push(`tab=${searchTab}`);
    return new URLSearchParams(parts.join('&'));
  },
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
  TaskDetail: ({ task, tab, onTabChange }: { task: Task; tab?: string; onTabChange?: (t: string) => void }) => (
    <div data-testid="task-detail" data-tab={tab}>
      {task.title}
      <button type="button" onClick={() => onTabChange?.('review')}>
        go-review
      </button>
    </div>
  ),
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
  searchTab = '';
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

    expect(await screen.findByText('Task not found')).toBeInTheDocument();
  });

  it('shows not-found when no id is supplied', async () => {
    searchId = '';
    render(withQueryClient(<TaskDetailView />));

    expect(await screen.findByText('Task not found')).toBeInTheDocument();
    expect(getTask).not.toHaveBeenCalled();
  });

  it('passes ?tab=review through and widens the container (Phase 52 E)', async () => {
    searchTab = 'review';
    getTask.mockResolvedValue(task({ prUrl: 'https://github.com/o/r/pull/1' }));
    const { container } = render(withQueryClient(<TaskDetailView />));

    expect(await screen.findByTestId('task-detail')).toHaveAttribute('data-tab', 'review');
    expect(container.querySelector('.max-w-5xl')).toBeTruthy();
    expect(container.querySelector('.max-w-3xl')).toBeNull();
  });

  it('defaults to the details tab (narrow) with no tab param', async () => {
    getTask.mockResolvedValue(task({ prUrl: 'https://github.com/o/r/pull/1' }));
    const { container } = render(withQueryClient(<TaskDetailView />));

    expect(await screen.findByTestId('task-detail')).toHaveAttribute('data-tab', 'details');
    expect(container.querySelector('.max-w-3xl')).toBeTruthy();
  });

  it('syncs the tab to the URL via router.replace', async () => {
    getTask.mockResolvedValue(task({ prUrl: 'https://github.com/o/r/pull/1' }));
    render(withQueryClient(<TaskDetailView />));

    fireEvent.click(await screen.findByRole('button', { name: 'go-review' }));
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('tab=review'));
  });
});
