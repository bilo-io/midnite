import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const createWorkflow = vi.fn();
const updateWorkflow = vi.fn();
vi.mock('@/lib/api', () => ({
  createWorkflow: (...args: unknown[]) => createWorkflow(...args),
  updateWorkflow: (...args: unknown[]) => updateWorkflow(...args),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { WorkflowCreateModal } from './workflow-create-modal';

beforeEach(() => {
  vi.clearAllMocks();
});

const SUMMARY_TEMPLATE = 'Fetch data and summarise with AI';

describe('WorkflowCreateModal — starter templates', () => {
  it('defaults to a blank workflow with the trigger picker shown', () => {
    render(<WorkflowCreateModal onClose={vi.fn()} />);
    expect(screen.getByText('Blank workflow')).toBeInTheDocument();
    expect(screen.getByText(SUMMARY_TEMPLATE)).toBeInTheDocument();
    // Blank mode: the trigger picker (with its webhook hint) is visible.
    expect(screen.getByText('Run on a request')).toBeInTheDocument();
  });

  it('picking a template prefills the name, hides the trigger picker, and relabels the action', () => {
    render(<WorkflowCreateModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(SUMMARY_TEMPLATE));

    expect(screen.getByLabelText('Name')).toHaveValue(SUMMARY_TEMPLATE);
    // Trigger now comes from the template — the picker is replaced by a note.
    expect(screen.queryByText('Run on a request')).toBeNull();
    expect(screen.getByText(/set by the template/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create from template' })).toBeInTheDocument();
  });

  it('creates from a template, then seeds the graph with the template chain', async () => {
    createWorkflow.mockResolvedValue({
      id: 'new-wf',
      name: SUMMARY_TEMPLATE,
      enabled: false,
      trigger: { type: 'manual' },
      nodes: [{ id: 'seeded-trigger', type: 'trigger.manual', position: { x: 80, y: 120 }, params: {} }],
      edges: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    updateWorkflow.mockResolvedValue({});

    render(<WorkflowCreateModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(SUMMARY_TEMPLATE));
    fireEvent.click(screen.getByRole('button', { name: 'Create from template' }));

    await waitFor(() => expect(updateWorkflow).toHaveBeenCalled());

    expect(createWorkflow).toHaveBeenCalledWith({ name: SUMMARY_TEMPLATE, trigger: { type: 'manual' } });
    const [id, body] = updateWorkflow.mock.calls[0] as [string, { nodes: { type: string }[]; edges: unknown[] }];
    expect(id).toBe('new-wf');
    expect(body.nodes.map((n) => n.type)).toEqual(['trigger.manual', 'http.request', 'ai.claude']);
    expect(body.edges).toHaveLength(2);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/workflows/edit?id=new-wf'));
  });
});
