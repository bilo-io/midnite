import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { TasksDoctorReport } from '@midnite/shared';
import { TaskHealthPanel } from './task-health-panel';

afterEach(cleanup);

const base: TasksDoctorReport = {
  generatedAt: '2026-07-03T12:00:00.000Z',
  needsAttention: [],
  stuckWip: [],
  agedTodo: [],
  waitingTooLong: [],
  failureCountsByClass: {},
  recentFailures: [],
  thresholds: { wipSilentMs: 900000, agedTodoMs: 86400000, waitingTooLongMs: 86400000 },
};

describe('TaskHealthPanel (Phase 53 E)', () => {
  it('renders nothing meaningful and an all-clear message when nothing is wedged', () => {
    render(<TaskHealthPanel report={base} />);
    expect(screen.getByText(/Nothing wedged/)).toBeInTheDocument();
  });

  it('lists needs-attention tasks with their reason and links to the task', () => {
    render(
      <TaskHealthPanel
        report={{
          ...base,
          needsAttention: [
            { id: 't1', title: 'Fix the flaky test', status: 'waiting', waitReason: 'retries-exhausted', retryCount: 3, sinceMs: 0 },
          ],
          failureCountsByClass: { crash: 2, timeout: 1 },
          recentFailures: [
            { id: 'f1', taskId: 't1', class: 'crash', detail: 'x', retryIndex: 0, at: base.generatedAt },
          ],
        }}
      />,
    );
    const link = screen.getByRole('link', { name: 'Fix the flaky test' });
    expect(link).toHaveAttribute('href', '/tasks/view?id=t1');
    expect(screen.getByText(/Retries exhausted/)).toBeInTheDocument();
    expect(screen.getByText(/Recent failures by class/)).toBeInTheDocument();
  });

  it('renders null when there is no report yet', () => {
    const { container } = render(<TaskHealthPanel report={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
