import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { WorkflowSummary } from '@midnite/shared';

afterEach(cleanup);

vi.mock('@/lib/api', () => ({
  getWorkflow: vi.fn(),
  runWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  createWorkflow: vi.fn(),
}));
vi.mock('@/lib/data-refresh', () => ({ invalidateData: vi.fn() }));

import { ToastProvider } from '@/components/toast';
import { SchedulesView } from './schedules-view';

const sched = (over: Partial<WorkflowSummary>): WorkflowSummary => ({
  id: 'w1',
  name: 'Daily standup',
  enabled: true,
  triggerType: 'schedule',
  cron: '0 9 * * *',
  timezone: 'UTC',
  nodeCount: 2,
  steps: [{ type: 'trigger.schedule' }, { type: 'task.create' }],
  createdAt: '2026-06-30T00:00:00Z',
  updatedAt: '2026-06-30T00:00:00Z',
  ...over,
});

const renderView = (initial: WorkflowSummary[]) =>
  render(
    <ToastProvider>
      <SchedulesView initial={initial} projects={[]} repos={[]} />
    </ToastProvider>,
  );

describe('SchedulesView', () => {
  it('shows the empty state when there are no schedule+task.create workflows', () => {
    renderView([
      // A schedule without a task.create action is not a "schedule" in the facade.
      sched({ id: 'x', steps: [{ type: 'trigger.schedule' }, { type: 'ai.claude' }] }),
      // A task.create workflow on a manual trigger is excluded too.
      sched({ id: 'y', triggerType: 'manual' }),
    ]);
    expect(screen.getByText('No schedules yet')).toBeInTheDocument();
  });

  it('lists matching schedules with their cadence', () => {
    renderView([sched({}), sched({ id: 'm', triggerType: 'manual' })]);
    expect(screen.getByText('Daily standup')).toBeInTheDocument();
    expect(screen.getByText(/Every day at 09:00/)).toBeInTheDocument();
    expect(screen.getByText('1 schedule')).toBeInTheDocument();
  });

  it('opens the create dialog from the New schedule button', () => {
    renderView([sched({})]);
    fireEvent.click(screen.getByRole('button', { name: 'New schedule' }));
    expect(screen.getByRole('dialog', { name: 'New schedule' })).toBeInTheDocument();
  });

  it('marks a disabled schedule as paused', () => {
    renderView([sched({ enabled: false })]);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });
});
