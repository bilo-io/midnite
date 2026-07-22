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
  updateTaskProject: vi.fn(),
}));

// The page (Phase 82) composes a header + sticky actions + rail shell around the
// shared body. This spec covers the page's own routing / fetch / not-found / tab
// logic — stub the body + the rail-fill children (agent runs, activity, actions,
// toast) so the assertions stay on the page's behaviour, not the children's.
vi.mock('@/components/task-detail', () => ({
  TaskDetail: ({ task, tab, onTabChange }: { task: Task; tab?: string; onTabChange?: (t: string) => void }) => (
    <div data-testid="task-detail" data-tab={tab}>
      {task.title}
      <button type="button" onClick={() => onTabChange?.('review')}>
        go-review
      </button>
    </div>
  ),
  Timeline: () => <div data-testid="activity" />,
  KIND_LABEL: { unknown: 'Task', bug: 'Bugfix', feature: 'Feature', question: 'Question', chore: 'Chore' },
  STATUS_LABEL: {
    backlog: 'Backlog',
    todo: 'Todo',
    wip: 'In progress',
    waiting: 'Waiting',
    done: 'Done',
    abandoned: 'Abandoned',
  },
}));
vi.mock('@/components/run-timeline', () => ({ RunTimeline: () => <div data-testid="agent-runs" /> }));
vi.mock('@/components/toast', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));
vi.mock('@/components/task-actions', () => ({
  useTaskActions: () => ({
    start: vi.fn(),
    abandon: vi.fn(),
    reopen: vi.fn(),
    remove: vi.fn(),
    statusBusy: false,
    statusError: null,
    setStatusError: vi.fn(),
  }),
  TaskActionButtons: () => null,
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

  it('surfaces the agent-runs and activity rails alongside the body', async () => {
    getTask.mockResolvedValue(task());
    render(withQueryClient(<TaskDetailView />));

    expect(await screen.findByTestId('task-detail')).toBeInTheDocument();
    expect(screen.getByTestId('agent-runs')).toBeInTheDocument();
    expect(screen.getByTestId('activity')).toBeInTheDocument();
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

  it('passes ?tab=review through to the body (Phase 52 E)', async () => {
    searchTab = 'review';
    getTask.mockResolvedValue(task({ prUrl: 'https://github.com/o/r/pull/1' }));
    render(withQueryClient(<TaskDetailView />));

    expect(await screen.findByTestId('task-detail')).toHaveAttribute('data-tab', 'review');
  });

  it('defaults to the details tab with no tab param', async () => {
    getTask.mockResolvedValue(task({ prUrl: 'https://github.com/o/r/pull/1' }));
    render(withQueryClient(<TaskDetailView />));

    expect(await screen.findByTestId('task-detail')).toHaveAttribute('data-tab', 'details');
  });

  it('syncs the tab to the URL via router.replace', async () => {
    getTask.mockResolvedValue(task({ prUrl: 'https://github.com/o/r/pull/1' }));
    render(withQueryClient(<TaskDetailView />));

    fireEvent.click(await screen.findByRole('button', { name: 'go-review' }));
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('tab=review'));
  });
});
