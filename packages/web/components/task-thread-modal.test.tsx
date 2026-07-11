import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Task } from '@midnite/shared';

// next/navigation's useRouter throws outside the App Router runtime, so stub it.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// data-refresh kicks the SWR cache; a no-op keeps the test gateway-free.
vi.mock('@/lib/data-refresh', () => ({ invalidateData: vi.fn() }));

const addTaskDependency = vi.fn();
const removeTaskDependency = vi.fn();
vi.mock('@/lib/api', () => ({
  gatewayUrl: () => 'http://gw',
  addTaskDependency: (...args: unknown[]) => addTaskDependency(...args),
  removeTaskDependency: (...args: unknown[]) => removeTaskDependency(...args),
  addTaskLink: vi.fn(),
  removeTaskLink: vi.fn(),
  setTaskTags: vi.fn(),
  startTask: vi.fn(),
  deleteTask: vi.fn(),
  updateTaskProject: vi.fn(),
  updateTaskStatus: vi.fn(),
  refreshPrStatus: vi.fn(),
  exportTask: vi.fn(),
  // ChecksPanel mounts and calls this; return empty so tests are unaffected.
  getCheckRuns: vi.fn().mockResolvedValue({ runs: [] }),
  triggerCheck: vi.fn(),
  // RunTimeline (Agent runs section) self-fetches; empty keeps tests unaffected.
  getRunTimeline: vi.fn().mockResolvedValue({ taskId: 't', runs: [] }),
}));

import { ConfirmProvider } from './confirm-dialog';
import { ToastProvider } from './toast';
import { TaskThreadModal } from './task-thread-modal';
import { withQueryClient } from '@/lib/test-query-wrapper';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function task(id: string, over: Partial<Task> = {}): Task {
  return { id, title: id, status: 'todo', priority: 1, retryCount: 0, fixAttempts: 0, tags: [], events: [], ...over };
}

function renderModal(task: Task, tasks: Task[]) {
  render(
    withQueryClient(
      <ToastProvider>
        <ConfirmProvider>
          <TaskThreadModal task={task} projects={[]} tasks={tasks} onClose={vi.fn()} />
        </ConfirmProvider>
      </ToastProvider>,
    ),
  );
}

describe('TaskThreadModal — Dependencies', () => {
  it('renders each blocker with its title and done/pending state', () => {
    const blockerDone = task('blk-done', { title: 'Done blocker', status: 'done' });
    const blockerWip = task('blk-wip', { title: 'Wip blocker', status: 'wip' });
    const subject = task('subj', { title: 'Subject', dependsOn: ['blk-done', 'blk-wip'] });
    renderModal(subject, [subject, blockerDone, blockerWip]);

    expect(screen.getByText('Done blocker')).toBeInTheDocument();
    expect(screen.getByText('Wip blocker')).toBeInTheDocument();
    expect(screen.getByText('done')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('lists tasks this one blocks under "Blocks"', () => {
    const subject = task('subj', { title: 'Subject' });
    const dependent = task('dep', { title: 'Dependent task', dependsOn: ['subj'] });
    renderModal(subject, [subject, dependent]);

    expect(screen.getByText('Blocks')).toBeInTheDocument();
    expect(screen.getByText('Dependent task')).toBeInTheDocument();
  });

  it('surfaces the gateway message when adding a blocker that would cycle', async () => {
    addTaskDependency.mockRejectedValueOnce(new Error('would create a dependency cycle'));
    const subject = task('subj', { title: 'Subject' });
    const candidate = task('other', { title: 'Other task' });
    renderModal(subject, [subject, candidate]);

    const picker = screen.getByLabelText('Search tasks to block on');
    fireEvent.focus(picker);
    fireEvent.change(picker, { target: { value: 'Other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Other task' }));

    expect(addTaskDependency).toHaveBeenCalledWith('subj', 'other');
    expect(await screen.findByText('would create a dependency cycle')).toBeInTheDocument();
  });

  it('removes a blocker via its remove button', async () => {
    const blocker = task('blk', { title: 'Blocker' });
    const subject = task('subj', { title: 'Subject', dependsOn: ['blk'] });
    removeTaskDependency.mockResolvedValueOnce({ ...subject, dependsOn: [] });
    renderModal(subject, [subject, blocker]);

    fireEvent.click(screen.getByLabelText('Remove blocker Blocker'));
    await waitFor(() => expect(removeTaskDependency).toHaveBeenCalledWith('subj', 'blk'));
  });
});
