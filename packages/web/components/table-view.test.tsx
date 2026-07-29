import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import type { TaskSummary } from '@midnite/shared';

import { TableView } from './table-view';
import { COLUMNS } from './task-columns';

afterEach(cleanup);

function task(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: 't1',
    title: 'Fix the broken login button',
    status: 'todo',
    kind: 'bug',
    priority: 1,
    retryCount: 0,
    tags: [],
    ...overrides,
  };
}

const baseProps = {
  columns: COLUMNS,
  projectsById: new Map(),
  onSelect: vi.fn(),
  showAbandoned: false,
};

describe('TableView drag-between-statuses', () => {
  it('gives each row a drag grip when onMove is wired', () => {
    render(<TableView {...baseProps} tasks={[task()]} onMove={vi.fn()} />);
    expect(screen.getByLabelText(/Drag Fix the broken login button/)).toBeInTheDocument();
  });

  it('leaves rows undraggable when onMove is absent (read-only embeddings)', () => {
    render(<TableView {...baseProps} tasks={[task()]} />);
    expect(screen.queryByLabelText(/Drag Fix the broken login button/)).toBeNull();
  });

  it('keeps the row clickable — the grip is a sibling, not a wrapper, so opening still works', () => {
    const onSelect = vi.fn();
    render(<TableView {...baseProps} tasks={[task()]} onSelect={onSelect} onMove={vi.fn()} />);

    // The row's own button (the one carrying the title), not the grip.
    screen.getByText('Fix the broken login button').closest('button')!.click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders an empty status section, so it stays a droppable target', () => {
    render(<TableView {...baseProps} tasks={[task({ status: 'todo' })]} onMove={vi.fn()} />);
    // Every primary column has a header even with no tasks in it.
    for (const col of COLUMNS) {
      expect(screen.getByRole('heading', { name: new RegExp(col.label, 'i') })).toBeInTheDocument();
    }
  });
});
