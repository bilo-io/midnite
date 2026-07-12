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

  it('leads with the fixed-width kind badge in the tasks views (no showStatus)', () => {
    render(<TaskRow task={baseTask} />);
    const kind = screen.getByText('Bugfix');
    // far-left, fixed-width leading column on sm+
    expect(kind.className).toContain('sm:order-first');
    expect(kind.className).toContain('sm:w-24');
  });

  it('leads with the fixed-width status badge in the projects tree (showStatus)', () => {
    render(<TaskRow task={baseTask} showStatus />);
    const status = screen.getByText('Todo');
    expect(status.className).toContain('sm:order-first');
    expect(status.className).toContain('sm:w-24');
    // kind is no longer the leader when status leads
    expect(screen.getByText('Bugfix').className).not.toContain('sm:order-first');
  });
});
