import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowSchema, type WorkflowRun } from '@midnite/shared';

import { RunOutputPanel } from './run-output-panel';
import { createWorkflowStore, WorkflowStoreContext } from '@/lib/workflow-store';

function renderPanel(run: WorkflowRun | null) {
  const workflow = WorkflowSchema.parse({
    id: 'wf-1',
    name: 'Test',
    trigger: { type: 'manual' },
    nodes: [
      { id: 'n1', type: 'http.request', position: { x: 0, y: 0 }, label: 'Fetch issues', params: {} },
      { id: 'n2', type: 'ai.claude', position: { x: 120, y: 0 }, label: 'Claude', params: {} },
    ],
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  });
  render(
    <WorkflowStoreContext.Provider value={createWorkflowStore(workflow)}>
      <RunOutputPanel run={run} />
    </WorkflowStoreContext.Provider>,
  );
}

const RUN: WorkflowRun = {
  id: 'run-1',
  workflowId: 'wf-1',
  status: 'failed',
  triggerSource: 'manual',
  startedAt: '2026-06-21T00:00:00.000Z',
  nodeRuns: [
    {
      id: 'r1',
      runId: 'run-1',
      nodeId: 'n1',
      nodeType: 'http.request',
      status: 'succeeded',
      input: { trigger: true },
      resolvedParams: { url: 'https://api.example.com/issues/1' },
      output: { title: 'Fix the bug' },
      logs: [],
    },
    {
      id: 'r2',
      runId: 'run-1',
      nodeId: 'n2',
      nodeType: 'ai.claude',
      status: 'failed',
      input: { title: 'Fix the bug' },
      error: 'expression error in "Claude": $node["Typo"].json.x',
      logs: [],
    },
  ],
};

describe('RunOutputPanel', () => {
  it('shows input → resolved params → output for an expanded node', () => {
    renderPanel(RUN);
    fireEvent.click(screen.getByRole('button', { name: /Fetch issues/ }));

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Resolved params')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
    // The resolved value (what the executor actually received) and the output show.
    expect(screen.getByText(/api\.example\.com\/issues\/1/)).toBeInTheDocument();
    expect(screen.getByText(/Fix the bug/)).toBeInTheDocument();
  });

  it("surfaces a failed node's expression error and omits absent resolved params", () => {
    renderPanel(RUN);
    fireEvent.click(screen.getByRole('button', { name: /Claude/ }));

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText(/expression error in "Claude"/)).toBeInTheDocument();
    // The node failed before resolution produced params, so no block is shown.
    expect(screen.queryByText('Resolved params')).toBeNull();
  });

  it('prompts to run when there is no run yet', () => {
    renderPanel(null);
    expect(screen.getByText(/Press Run to execute/)).toBeInTheDocument();
  });
});
