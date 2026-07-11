import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Task, TaskRetro } from '@midnite/shared';

import { RetroBody } from './retro-tab';

// ExportMenu pulls in clipboard/toast plumbing; stub it to a marker.
vi.mock('@/components/export-menu', () => ({
  ExportMenu: () => <div>export-menu</div>,
}));

function task(): Task {
  return { id: 't1', title: 'Add cost views' } as Task;
}

function retro(partial: Partial<TaskRetro> = {}): TaskRetro {
  return {
    taskId: 't1',
    outcome: 'done',
    timeline: [{ at: '2026-07-10T00:00:00.000Z', kind: 'status.changed', detail: 'todo → wip' }],
    attempts: [
      { startedAt: '2026-07-10T00:00:00.000Z', endedAt: '2026-07-10T00:05:00.000Z', durationMs: 300_000, outcome: 'done', retryIndex: 0 },
    ],
    failures: [],
    durations: { waitMs: 60_000, workMs: 300_000, totalMs: 360_000 },
    narrative: null,
    createdAt: '2026-07-10T00:06:00.000Z',
    ...partial,
  };
}

describe('RetroBody', () => {
  it('renders the deterministic skeleton (outcome, timing, attempts) without an AI badge', () => {
    render(<RetroBody task={task()} retro={retro()} />);
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Timing')).toBeInTheDocument();
    // durations: wait 1m 0s (unique), total 6m 0s (unique); work 5m 0s also
    // appears as the single attempt's duration, hence getAllByText.
    expect(screen.getByText('1m 0s')).toBeInTheDocument();
    expect(screen.getByText('6m 0s')).toBeInTheDocument();
    expect(screen.getAllByText('5m 0s').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Attempt 1')).toBeInTheDocument();
    expect(screen.queryByText('AI summary')).not.toBeInTheDocument();
  });

  it('shows the AI-summary badge + narrative when a narrative is present', () => {
    render(
      <RetroBody
        task={task()}
        retro={retro({
          narrative: {
            whatHappened: 'Shipped two charts.',
            whatTrippedIt: 'A flaky test.',
            notable: ['Reused existing endpoints'],
            generatedBy: 'llm',
          },
        })}
      />,
    );
    expect(screen.getByText('AI summary')).toBeInTheDocument();
    expect(screen.getByText('Shipped two charts.')).toBeInTheDocument();
    expect(screen.getByText(/Reused existing endpoints/)).toBeInTheDocument();
  });

  it('renders the failure story for an abandoned task', () => {
    render(
      <RetroBody
        task={task()}
        retro={retro({
          outcome: 'abandoned',
          failures: [
            {
              id: 'f1',
              taskId: 't1',
              class: 'retries-exhausted',
              detail: 'gave up after 3 tries',
              retryIndex: 3,
              at: '2026-07-10T00:05:00.000Z',
            },
          ],
        })}
      />,
    );
    expect(screen.getByText('Abandoned')).toBeInTheDocument();
    expect(screen.getByText('What tripped it')).toBeInTheDocument();
    expect(screen.getByText('retries-exhausted')).toBeInTheDocument();
    expect(screen.getByText(/gave up after 3 tries/)).toBeInTheDocument();
  });
});
