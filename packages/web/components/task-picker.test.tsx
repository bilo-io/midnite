import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import type { Task } from '@midnite/shared';

import { TaskPicker } from './task-picker';

afterEach(cleanup);

function task(id: string, title: string): Task {
  return { id, title, status: 'todo', priority: 1, retryCount: 0, fixAttempts: 0, tags: [], events: [] };
}

const CANDIDATES: Task[] = [
  task('a', 'Ship the API'),
  task('b', 'Write the docs'),
  task('c', 'Add the picker'),
];

describe('TaskPicker', () => {
  it('filters candidates by typed title (case-insensitive)', () => {
    render(<TaskPicker candidates={CANDIDATES} onPick={vi.fn()} label="Search tasks" />);
    const input = screen.getByLabelText('Search tasks');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'the' } });

    // All three contain "the" — switch to a narrower query.
    fireEvent.change(input, { target: { value: 'docs' } });
    expect(screen.getByRole('button', { name: 'Write the docs' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ship the API' })).toBeNull();
  });

  it('calls onPick with the chosen task when a match is clicked', () => {
    const onPick = vi.fn();
    render(<TaskPicker candidates={CANDIDATES} onPick={onPick} label="Search tasks" />);
    const input = screen.getByLabelText('Search tasks');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'picker' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add the picker' }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
  });

  it('picks the first match on Enter', () => {
    const onPick = vi.fn();
    render(<TaskPicker candidates={CANDIDATES} onPick={onPick} label="Search tasks" />);
    const input = screen.getByLabelText('Search tasks');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ship' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });
});
