import { describe, expect, it } from 'vitest';
import { WorkflowSchema, type NodeRun } from '@midnite/shared';

import { createWorkflowStore } from './workflow-store';

function makeStore() {
  const workflow = WorkflowSchema.parse({
    id: 'wf-1',
    name: 'Test',
    trigger: { type: 'manual' },
    nodes: [
      { id: 'n1', type: 'http.request', position: { x: 0, y: 0 }, label: 'Fetch', params: {} },
      { id: 'n2', type: 'ai.claude', position: { x: 120, y: 0 }, label: 'Claude', params: {} },
    ],
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  });
  return createWorkflowStore(workflow);
}

function nodeRun(over: Partial<NodeRun> & { nodeId: string }): NodeRun {
  return {
    id: `r-${over.nodeId}`,
    runId: 'run-1',
    nodeType: 'http.request',
    status: 'succeeded',
    logs: [],
    ...over,
  };
}

describe('workflow-store applyRunState', () => {
  it('reflects per-node status and failure message onto the canvas nodes', () => {
    const store = makeStore();
    store.getState().applyRunState([
      nodeRun({ nodeId: 'n1', status: 'succeeded' }),
      nodeRun({ nodeId: 'n2', status: 'failed', error: 'expression error in "Claude": $node["Typo"]' }),
    ]);

    const byId = Object.fromEntries(store.getState().nodes.map((n) => [n.id, n.data]));
    expect(byId.n1?.status).toBe('succeeded');
    expect(byId.n1?.error).toBeUndefined();
    expect(byId.n2?.status).toBe('failed');
    expect(byId.n2?.error).toContain('expression error');
  });

  it('clears stale status/error for nodes absent from a later run', () => {
    const store = makeStore();
    store.getState().applyRunState([nodeRun({ nodeId: 'n1', status: 'failed', error: 'boom' })]);
    // A re-run that only touches n2 must not leave n1's old failure behind.
    store.getState().applyRunState([nodeRun({ nodeId: 'n2', status: 'succeeded' })]);

    const n1 = store.getState().nodes.find((n) => n.id === 'n1');
    expect(n1?.data.status).toBeUndefined();
    expect(n1?.data.error).toBeUndefined();
  });
});
