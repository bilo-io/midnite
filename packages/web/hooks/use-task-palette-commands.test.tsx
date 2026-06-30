import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Task } from '@midnite/shared';

afterEach(cleanup);

const moveTask = vi.fn();
vi.mock('@/lib/task-transitions', () => ({ moveTask: (...a: unknown[]) => moveTask(...a) }));
vi.mock('@/lib/data-refresh', () => ({ invalidateData: vi.fn() }));

const confirmFn = vi.fn();
vi.mock('@/components/confirm-dialog', () => ({ useConfirm: () => confirmFn }));
vi.mock('@/components/toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

import { PaletteCommandsProvider, usePaletteCommands } from '@/lib/palette-commands';
import { useTaskPaletteCommands } from './use-task-palette-commands';

const task = (over: Partial<Task>): Task =>
  ({
    id: 't1',
    title: 'Fix login',
    status: 'todo',
    kind: 'bug',
    tags: [],
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as Task;

function Harness({ t, tasks }: { t: Task; tasks: Task[] }) {
  useTaskPaletteCommands(t, tasks);
  const cmds = usePaletteCommands();
  return (
    <ul>
      {cmds.map((c) => (
        <li key={c.id}>
          <button onClick={c.action}>{c.label}</button>
        </li>
      ))}
    </ul>
  );
}

const renderHook = (t: Task, tasks: Task[] = []) =>
  render(
    <PaletteCommandsProvider>
      <Harness t={t} tasks={tasks} />
    </PaletteCommandsProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  confirmFn.mockResolvedValue(true);
  moveTask.mockResolvedValue(undefined);
});

describe('useTaskPaletteCommands', () => {
  it('registers the move commands, skipping the current status', () => {
    renderHook(task({ status: 'todo' }));
    expect(screen.getByText('Move to in progress')).toBeInTheDocument();
    expect(screen.getByText('Mark done')).toBeInTheDocument();
    expect(screen.getByText('Move to waiting')).toBeInTheDocument();
    expect(screen.getByText('Abandon task')).toBeInTheDocument();
  });

  it('drops the command matching the task’s own status', () => {
    renderHook(task({ status: 'wip' }));
    expect(screen.queryByText('Move to in progress')).toBeNull();
    expect(screen.getByText('Mark done')).toBeInTheDocument();
  });

  it('moves without a prompt for a non-destructive transition', async () => {
    renderHook(task({ status: 'wip' }));
    fireEvent.click(screen.getByText('Mark done'));
    await waitFor(() => expect(moveTask).toHaveBeenCalledWith('wip', 'done', 't1'));
    expect(confirmFn).not.toHaveBeenCalled();
  });

  it('confirms before abandoning', async () => {
    renderHook(task({ status: 'wip' }));
    fireEvent.click(screen.getByText('Abandon task'));
    await waitFor(() => expect(confirmFn).toHaveBeenCalled());
    expect(moveTask).toHaveBeenCalledWith('wip', 'abandoned', 't1');
  });

  it('does not move when the abandon confirm is declined', async () => {
    confirmFn.mockResolvedValue(false);
    renderHook(task({ status: 'wip' }));
    fireEvent.click(screen.getByText('Abandon task'));
    await waitFor(() => expect(confirmFn).toHaveBeenCalled());
    expect(moveTask).not.toHaveBeenCalled();
  });

  it('confirms a blocked start (unmet blocker) before moving to wip', async () => {
    const blocker = task({ id: 'b1', status: 'todo' });
    const blocked = task({ id: 't1', status: 'todo', dependsOn: ['b1'] });
    renderHook(blocked, [blocked, blocker]);
    fireEvent.click(screen.getByText('Move to in progress'));
    await waitFor(() => expect(confirmFn).toHaveBeenCalled());
    expect(moveTask).toHaveBeenCalledWith('todo', 'wip', 't1');
  });
});
