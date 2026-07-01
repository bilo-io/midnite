import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Workflow } from '@midnite/shared';

const createWorkflow = vi.fn();
const getWorkflow = vi.fn();
const updateWorkflow = vi.fn();
vi.mock('@/lib/api', () => ({
  createWorkflow: (...a: unknown[]) => createWorkflow(...a),
  getWorkflow: (...a: unknown[]) => getWorkflow(...a),
  updateWorkflow: (...a: unknown[]) => updateWorkflow(...a),
}));

import { ScheduleFormDialog } from './schedule-form-dialog';

const seeded: Workflow = {
  id: 'w1',
  name: '',
  enabled: false,
  trigger: { type: 'schedule', cron: '0 9 * * *', timezone: 'UTC' },
  nodes: [{ id: 'trig', type: 'trigger.schedule', label: 'Schedule', position: { x: 80, y: 120 }, params: {} }],
  edges: [],
  createdAt: '2026-06-30T00:00:00Z',
  updatedAt: '2026-06-30T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  createWorkflow.mockResolvedValue({ ...seeded });
  getWorkflow.mockResolvedValue({ ...seeded });
  updateWorkflow.mockResolvedValue({ ...seeded });
});

describe('ScheduleFormDialog', () => {
  it('disables save until a name and prompt are present', () => {
    render(<ScheduleFormDialog projects={[]} repos={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    const save = screen.getByRole('button', { name: 'Create schedule' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Standup' } });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Task prompt'), { target: { value: 'Daily standup' } });
    expect(save).toBeEnabled();
  });

  it('creates a workflow then persists the [schedule]→[task.create] graph', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<ScheduleFormDialog projects={[]} repos={[]} onClose={onClose} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Standup' } });
    fireEvent.change(screen.getByLabelText('Task prompt'), { target: { value: 'Daily standup' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create schedule' }));

    await waitFor(() => expect(updateWorkflow).toHaveBeenCalled());
    expect(createWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Standup', trigger: { type: 'schedule', cron: '0 9 * * *', timezone: 'UTC' } }),
    );
    const [, body] = updateWorkflow.mock.calls[0]!;
    expect(body.enabled).toBe(true);
    expect(body.nodes).toHaveLength(2);
    const task = body.nodes.find((n: { type: string }) => n.type === 'task.create');
    expect(task.params).toEqual({ prompt: 'Daily standup' });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('pre-fills fields when editing an existing schedule', () => {
    const existing: Workflow = {
      ...seeded,
      name: 'Weekly cleanup',
      enabled: true,
      trigger: { type: 'schedule', cron: '0 9 * * 1', timezone: 'UTC' },
      nodes: [
        ...seeded.nodes,
        { id: 'task', type: 'task.create', label: 'Create task', position: { x: 320, y: 120 }, params: { prompt: 'Tidy up' } },
      ],
    };
    render(<ScheduleFormDialog projects={[]} repos={[]} workflow={existing} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Weekly cleanup');
    expect(screen.getByLabelText('Task prompt')).toHaveValue('Tidy up');
    // An edit must not create a new workflow — it updates in place.
    expect(screen.getByRole('button', { name: 'Save schedule' })).toBeEnabled();
  });
});
