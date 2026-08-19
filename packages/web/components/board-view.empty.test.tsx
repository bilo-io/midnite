import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TaskSummary } from '@midnite/shared';
import { BoardView } from './board-view';
import { COLUMNS } from '@/components/task-columns';
import { renderWithIntl as render } from '@/vitest.render-intl';

// The board is where the setup wizard's "Start building" lands a brand-new
// user, and it used to render six empty columns showing `0` — no guidance at
// the exact moment it's most needed.

/** The required TaskViewProps every case shares. */
const baseProps = {
  columns: COLUMNS,
  projectsById: new Map(),
  onSelect: vi.fn(),
  showAbandoned: false,
};

describe('BoardView — empty board', () => {
  it('shows a guided empty state instead of bare columns', () => {
    render(<BoardView {...baseProps} tasks={[]} onAddTask={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /your board is empty/i })).toBeTruthy();
  });

  it('offers a first-task CTA when adding is possible', () => {
    const onAddTask = vi.fn();
    render(<BoardView {...baseProps} tasks={[]} onAddTask={onAddTask} />);
    screen.getByRole('button', { name: /add your first task/i }).click();
    expect(onAddTask).toHaveBeenCalledWith('todo');
  });

  it('omits the CTA when the board is read-only', () => {
    render(<BoardView {...baseProps} tasks={[]} />);
    expect(screen.queryByRole('button', { name: /add your first task/i })).toBeNull();
  });

  it('renders the real columns as soon as a task exists', () => {
    const tasks: TaskSummary[] = [
      { id: 't1', title: 'First', status: 'todo', kind: 'bug', priority: 1, retryCount: 0, tags: [] },
    ];
    render(<BoardView {...baseProps} tasks={tasks} />);
    expect(screen.queryByRole('heading', { name: /your board is empty/i })).toBeNull();
    expect(screen.getByText('First')).toBeTruthy();
  });
});
