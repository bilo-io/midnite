import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkflowSchema, type NodeRun, type WorkflowRun } from '@midnite/shared';

import { RunHistoryPanel } from './run-history-panel';
import { ToastProvider } from './toast';
import { createWorkflowStore, WorkflowStoreContext } from '@/lib/workflow-store';

vi.mock('@/lib/api', () => ({
  listWorkflowRuns: vi.fn(),
  getWorkflowRun: vi.fn(),
}));

import { listWorkflowRuns, getWorkflowRun } from '@/lib/api';

const WORKFLOW = WorkflowSchema.parse({
  id: 'wf-1',
  name: 'Test',
  trigger: { type: 'manual' },
  nodes: [
    { id: 'n1', type: 'http.request', position: { x: 0, y: 0 }, label: 'Fetch', params: {} },
    { id: 'n2', type: 'ai.claude', position: { x: 120, y: 0 }, label: 'Claude', params: {} },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const NODE_RUNS: NodeRun[] = [
  {
    id: 'r1', runId: 'run-1', nodeId: 'n1', nodeType: 'http.request',
    status: 'succeeded', logs: [], startedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'r2', runId: 'run-1', nodeId: 'n2', nodeType: 'ai.claude',
    status: 'succeeded', logs: [], startedAt: '2026-01-01T00:00:01.000Z',
  },
];

const RUN: WorkflowRun = {
  id: 'run-1', workflowId: 'wf-1', status: 'succeeded',
  triggerSource: 'manual', startedAt: '2026-01-01T00:00:00.000Z',
  nodeRuns: NODE_RUNS,
};

function renderPanel(onClose = vi.fn()) {
  const store = createWorkflowStore(WORKFLOW);
  render(
    <ToastProvider>
      <WorkflowStoreContext.Provider value={store}>
        <RunHistoryPanel workflowId="wf-1" onClose={onClose} />
      </WorkflowStoreContext.Provider>
    </ToastProvider>,
  );
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RunHistoryPanel', () => {
  it('shows loading state while fetching', () => {
    (listWorkflowRuns as Mock).mockReturnValue(new Promise(() => {}));
    renderPanel();
    expect(screen.getByText(/Loading runs/)).toBeInTheDocument();
  });

  it('shows empty state when no runs exist', async () => {
    (listWorkflowRuns as Mock).mockResolvedValue([]);
    renderPanel();
    await waitFor(() => expect(screen.getByText(/No runs yet/)).toBeInTheDocument());
  });

  it('shows error when list fetch fails', async () => {
    (listWorkflowRuns as Mock).mockRejectedValue(new Error('Network error'));
    renderPanel();
    await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument());
  });

  it('lists runs with status and date', async () => {
    (listWorkflowRuns as Mock).mockResolvedValue([RUN]);
    renderPanel();
    await waitFor(() => expect(screen.getByText('succeeded')).toBeInTheDocument());
    expect(screen.getByText(/Jan 1/)).toBeInTheDocument();
  });

  it('enters replay mode when a run is clicked', async () => {
    (listWorkflowRuns as Mock).mockResolvedValue([RUN]);
    renderPanel();
    await waitFor(() => screen.getByText('succeeded'));
    fireEvent.click(screen.getByRole('button', { name: /succeeded/ }));
    await waitFor(() => expect(screen.getByText(/Step 0 \/ 2/)).toBeInTheDocument());
  });

  it('applies run state to the store when stepping forward', async () => {
    (listWorkflowRuns as Mock).mockResolvedValue([RUN]);
    const store = renderPanel();
    await waitFor(() => screen.getByText('succeeded'));
    fireEvent.click(screen.getByRole('button', { name: /succeeded/ }));
    await waitFor(() => screen.getByText(/Step 0 \/ 2/));

    fireEvent.click(screen.getByRole('button', { name: /Next step/ }));
    await waitFor(() => expect(screen.getByText(/Step 1 \/ 2/)).toBeInTheDocument());
    expect(store.getState().nodes[0]?.data.status).toBe('succeeded');
    // n2 hasn't been reached yet at step 1
    expect(store.getState().nodes[1]?.data.status).toBeUndefined();
  });

  it('jumps to last step and applies all node runs', async () => {
    (listWorkflowRuns as Mock).mockResolvedValue([RUN]);
    const store = renderPanel();
    await waitFor(() => screen.getByText('succeeded'));
    fireEvent.click(screen.getByRole('button', { name: /succeeded/ }));
    await waitFor(() => screen.getByText(/Step 0 \/ 2/));

    fireEvent.click(screen.getByRole('button', { name: /Last step/ }));
    await waitFor(() => expect(screen.getByText(/Step 2 \/ 2/)).toBeInTheDocument());
    expect(store.getState().nodes[0]?.data.status).toBe('succeeded');
    expect(store.getState().nodes[1]?.data.status).toBe('succeeded');
  });

  it('clears canvas state and calls onClose when closing', async () => {
    (listWorkflowRuns as Mock).mockResolvedValue([RUN]);
    const onClose = vi.fn();
    const store = renderPanel(onClose);
    await waitFor(() => screen.getByText('succeeded'));
    fireEvent.click(screen.getByRole('button', { name: /succeeded/ }));
    await waitFor(() => screen.getByText(/Step 0 \/ 2/));
    // Jump to end so nodes have status set
    fireEvent.click(screen.getByRole('button', { name: /Last step/ }));
    await waitFor(() => screen.getByText(/Step 2 \/ 2/));

    fireEvent.click(screen.getByRole('button', { name: /Close run history/ }));
    expect(onClose).toHaveBeenCalled();
    // Canvas should be cleared
    expect(store.getState().nodes.every((n) => n.data.status === undefined)).toBe(true);
  });

  it('navigates back to run list from replay mode', async () => {
    (listWorkflowRuns as Mock).mockResolvedValue([RUN]);
    renderPanel();
    await waitFor(() => screen.getByText('succeeded'));
    fireEvent.click(screen.getByRole('button', { name: /succeeded/ }));
    await waitFor(() => screen.getByText(/Step 0 \/ 2/));

    fireEvent.click(screen.getByRole('button', { name: /Back to run list/ }));
    await waitFor(() => expect(screen.getByText('succeeded')).toBeInTheDocument());
    expect(screen.queryByText(/Step 0/)).toBeNull();
  });

  it('fetches full run data when nodeRuns are empty in the list', async () => {
    const sparse: WorkflowRun = { ...RUN, nodeRuns: [] };
    (listWorkflowRuns as Mock).mockResolvedValue([sparse]);
    (getWorkflowRun as Mock).mockResolvedValue(RUN);
    renderPanel();
    await waitFor(() => screen.getByText('succeeded'));
    fireEvent.click(screen.getByRole('button', { name: /succeeded/ }));
    await waitFor(() => expect(getWorkflowRun).toHaveBeenCalledWith('wf-1', 'run-1'));
    await waitFor(() => expect(screen.getByText(/Step 0 \/ 2/)).toBeInTheDocument());
  });
});
