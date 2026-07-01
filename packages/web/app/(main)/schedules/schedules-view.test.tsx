import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { WorkflowRun, WorkflowSummary, WorkflowTemplateSummary } from '@midnite/shared';

afterEach(cleanup);

const listWorkflowRuns = vi.fn();
const getWorkflowRun = vi.fn();
const installWorkflowTemplate = vi.fn();
vi.mock('@/lib/api', () => ({
  getWorkflow: vi.fn(),
  runWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  createWorkflow: vi.fn(),
  listWorkflowRuns: (...a: unknown[]) => listWorkflowRuns(...a),
  getWorkflowRun: (...a: unknown[]) => getWorkflowRun(...a),
  installWorkflowTemplate: (...a: unknown[]) => installWorkflowTemplate(...a),
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

const preset = (): WorkflowTemplateSummary => ({
  id: 'tpl1',
  slug: 'daily-standup',
  name: 'Daily standup',
  description: 'Opens a standup task every weekday.',
  category: 'scheduling',
  tags: ['recurring-task'],
  credentialSlots: [],
  published: true,
  authorId: null,
  createdAt: '',
  updatedAt: '',
});

const renderView = (
  initial: WorkflowSummary[],
  templates: WorkflowTemplateSummary[] = [],
) =>
  render(
    <ToastProvider>
      <SchedulesView initial={initial} projects={[]} repos={[]} templates={templates} />
    </ToastProvider>,
  );

describe('SchedulesView', () => {
  it('shows the empty state when there are no schedule+task.create workflows', () => {
    renderView([
      sched({ id: 'x', steps: [{ type: 'trigger.schedule' }, { type: 'ai.claude' }] }),
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

  it('expands run history on demand, linking each run to its created task', async () => {
    const run: WorkflowRun = {
      id: 'r1',
      workflowId: 'w1',
      status: 'succeeded',
      triggerSource: 'schedule',
      startedAt: '2026-06-30T09:00:00Z',
      nodeRuns: [
        { id: 'nr', runId: 'r1', nodeId: 'n2', nodeType: 'task.create', status: 'succeeded', output: { id: 't-9', title: 'Standup task' }, logs: [] },
      ],
    };
    // The list endpoint omits nodeRuns; the detail fetch carries the task.create output.
    listWorkflowRuns.mockResolvedValue([{ ...run, nodeRuns: [] }]);
    getWorkflowRun.mockResolvedValue(run);
    renderView([sched({})]);
    expect(listWorkflowRuns).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    const link = await screen.findByRole('link', { name: /Standup task/ });
    expect(link).toHaveAttribute('href', '/tasks/view?id=t-9');
  });

  it('offers a preset only when a recurring-task scheduling template exists', () => {
    renderView([sched({})], [preset()]);
    expect(screen.getByRole('button', { name: 'New from preset' })).toBeInTheDocument();
  });

  it('hides the preset button when no presets are available', () => {
    renderView([sched({})], []);
    expect(screen.queryByRole('button', { name: 'New from preset' })).toBeNull();
  });
});
