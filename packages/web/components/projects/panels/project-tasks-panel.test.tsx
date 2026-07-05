import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Task } from '@midnite/shared';

import { ProjectTasksPanel } from './project-tasks-panel';

afterEach(cleanup);

const task: Task = {
  id: 't1',
  title: 'Wire the scheduler',
  status: 'todo',
  priority: 1,
  retryCount: 0,
  fixAttempts: 0,
  tags: [],
  events: [],
};

it('shows the empty state when there are no tasks', () => {
  render(<ProjectTasksPanel tasks={[]} />);
  expect(screen.getByText(/No tasks in this project yet/i)).toBeInTheDocument();
});

it('renders a row per task and fires onSelectTask on click', () => {
  const onSelectTask = vi.fn();
  render(<ProjectTasksPanel tasks={[task]} onSelectTask={onSelectTask} />);

  const row = screen.getByText('Wire the scheduler');
  expect(row).toBeInTheDocument();
  fireEvent.click(row);
  expect(onSelectTask).toHaveBeenCalledWith(task);
});
