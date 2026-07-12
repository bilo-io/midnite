import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { TaskSummary } from '@midnite/shared';

import { TaskRow } from './task-row';

afterEach(cleanup);

const baseTask: TaskSummary = {
  id: 't1',
  title: 'Fix the broken login button',
  status: 'todo',
  kind: 'bug',
  priority: 1,
  retryCount: 0,
  tags: [],
};

describe('TaskRow', () => {
  it('renders a bug task type as "Bugfix"', () => {
    render(<TaskRow task={baseTask} />);
    expect(screen.getByText('Bugfix')).toBeInTheDocument();
  });

  it('leads with the kind badge in a fixed-width cell, pill hugging its label', () => {
    render(<TaskRow task={baseTask} />);
    const pill = screen.getByText('Bugfix');
    const cell = pill.parentElement!;
    // The reserved-space cell is the fixed-width leading column…
    expect(cell.className).toContain('sm:order-first');
    expect(cell.className).toContain('sm:w-24');
    // …while the coloured pill itself stays fit-content (no fixed width).
    expect(pill.className).not.toContain('sm:w-24');
  });

  it('keeps the kind badge leading and trails status at the far right (projects tree)', () => {
    render(<TaskRow task={baseTask} showStatus />);
    // kind still leads
    expect(screen.getByText('Bugfix').parentElement!.className).toContain('sm:order-first');
    // status trails: no leading order, intrinsic width
    const status = screen.getByText('Todo');
    expect(status.className).not.toContain('sm:order-first');
    expect(status.className).not.toContain('sm:w-24');
  });
});
