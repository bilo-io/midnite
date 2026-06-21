import { describe, expect, it } from 'vitest';
import { WorkflowSchema, type NodeRun } from '@midnite/shared';

import { createWorkflowStore, uniqueLabel } from './workflow-store';

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

describe('workflow-store markSaved revision guard', () => {
  it('clears dirty when the save completes at the current revision', () => {
    const store = makeStore();
    store.getState().setName('Renamed');
    const rev = store.getState().revision;
    expect(store.getState().dirty).toBe(true);

    store.getState().markSaved(rev);
    expect(store.getState().dirty).toBe(false);
  });

  it('keeps dirty when an edit landed during the save (stale revision)', () => {
    const store = makeStore();
    store.getState().setName('first');
    const rev = store.getState().revision; // captured when the save starts
    store.getState().setName('second'); // edit arrives mid-save → revision advances

    store.getState().markSaved(rev); // stale → must not clear
    expect(store.getState().dirty).toBe(true);
  });

  it('clears unconditionally when called with no revision', () => {
    const store = makeStore();
    store.getState().setName('Renamed');
    store.getState().markSaved();
    expect(store.getState().dirty).toBe(false);
  });
});

describe('uniqueLabel', () => {
  it('returns the desired label when free, and suffixes on collision', () => {
    expect(uniqueLabel('HTTP Request', ['Fetch'])).toBe('HTTP Request');
    expect(uniqueLabel('HTTP Request', ['HTTP Request'])).toBe('HTTP Request 2');
    expect(uniqueLabel('HTTP Request', ['HTTP Request', 'HTTP Request 2'])).toBe('HTTP Request 3');
  });

  it('falls back for a blank desired label', () => {
    expect(uniqueLabel('   ', ['Node'], 'Node')).toBe('Node 2');
  });
});

describe('workflow-store node labels', () => {
  it('auto-suffixes a duplicate label when adding nodes of the same type', () => {
    const store = makeStore();
    store.getState().addNode('http.request');
    store.getState().addNode('http.request');
    const added = store.getState().nodes.slice(2).map((n) => n.data.label);
    expect(added).toHaveLength(2);
    expect(added[0]).not.toBe(added[1]);
    expect(added[1]).toBe(`${added[0]} 2`); // the second is suffixed off the first
  });

  it('setLabel keeps labels unique (auto-suffixes a clash) and bumps dirty', () => {
    const store = makeStore();
    // n1 is 'Fetch', n2 is 'Claude' — renaming n1 to 'Claude' must not collide.
    store.getState().setLabel('n1', 'Claude');
    expect(store.getState().nodes.find((n) => n.id === 'n1')!.data.label).toBe('Claude 2');
    expect(store.getState().dirty).toBe(true);
  });

  it('setLabel accepts a free name as-is', () => {
    const store = makeStore();
    store.getState().setLabel('n1', 'Fetch issues');
    expect(store.getState().nodes.find((n) => n.id === 'n1')!.data.label).toBe('Fetch issues');
  });
});

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
