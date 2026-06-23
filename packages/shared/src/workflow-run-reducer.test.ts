import { describe, expect, it } from 'vitest';
import type { WorkflowEvent } from './events/workflow.js';
import type { NodeRun, WorkflowRun } from './run.js';
import { applyWorkflowEvent, isRunTerminal } from './workflow-run-reducer.js';

const RUN_ID = 'run-1';
const WF_ID = 'wf-1';

function nodeRun(nodeId: string, overrides: Partial<NodeRun> = {}): NodeRun {
  return {
    id: `nr-${nodeId}`,
    runId: RUN_ID,
    nodeId,
    nodeType: 'http.request',
    status: 'pending',
    logs: [],
    ...overrides,
  };
}

// A freshly-seeded snapshot as `runWorkflow` returns it: running, all nodes pending.
function seed(): WorkflowRun {
  return {
    id: RUN_ID,
    workflowId: WF_ID,
    status: 'running',
    triggerSource: 'manual',
    startedAt: '2026-06-22T00:00:00.000Z',
    nodeRuns: [
      nodeRun('trigger', { nodeType: 'trigger.manual' }),
      nodeRun('fetch'),
      nodeRun('notify'),
    ],
  };
}

// Fold a sequence of events through the reducer from a starting snapshot.
function fold(start: WorkflowRun | null, events: WorkflowEvent[]): WorkflowRun | null {
  return events.reduce<WorkflowRun | null>((acc, ev) => applyWorkflowEvent(acc, ev), start);
}

const statusOf = (run: WorkflowRun | null, nodeId: string) =>
  run?.nodeRuns.find((nr) => nr.nodeId === nodeId)?.status;

describe('isRunTerminal', () => {
  it('treats final statuses as terminal', () => {
    expect(isRunTerminal('succeeded')).toBe(true);
    expect(isRunTerminal('failed')).toBe(true);
    expect(isRunTerminal('canceled')).toBe(true);
  });
  it('treats in-flight statuses as non-terminal', () => {
    expect(isRunTerminal('queued')).toBe(false);
    expect(isRunTerminal('running')).toBe(false);
  });
});

describe('applyWorkflowEvent — node transitions', () => {
  it('marks a node running on node.started without touching siblings', () => {
    const next = applyWorkflowEvent(seed(), {
      type: 'node.started',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: '2026-06-22T00:00:01.000Z',
      nodeId: 'fetch',
      nodeType: 'http.request',
    });
    expect(statusOf(next, 'fetch')).toBe('running');
    expect(next?.nodeRuns.find((nr) => nr.nodeId === 'fetch')?.startedAt).toBe(
      '2026-06-22T00:00:01.000Z',
    );
    expect(statusOf(next, 'trigger')).toBe('pending');
    expect(statusOf(next, 'notify')).toBe('pending');
  });

  it('records output + finishedAt on node.succeeded', () => {
    const next = applyWorkflowEvent(seed(), {
      type: 'node.succeeded',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: '2026-06-22T00:00:02.000Z',
      nodeId: 'fetch',
      output: { status: 200 },
    });
    const nr = next?.nodeRuns.find((n) => n.nodeId === 'fetch');
    expect(nr?.status).toBe('succeeded');
    expect(nr?.output).toEqual({ status: 200 });
    expect(nr?.finishedAt).toBe('2026-06-22T00:00:02.000Z');
  });

  it('records error on node.failed', () => {
    const next = applyWorkflowEvent(seed(), {
      type: 'node.failed',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: '2026-06-22T00:00:03.000Z',
      nodeId: 'fetch',
      error: 'boom',
    });
    const nr = next?.nodeRuns.find((n) => n.nodeId === 'fetch');
    expect(nr?.status).toBe('failed');
    expect(nr?.error).toBe('boom');
  });
});

describe('applyWorkflowEvent — purity & seeding', () => {
  it('never mutates the input snapshot', () => {
    const start = seed();
    const snapshot = JSON.parse(JSON.stringify(start));
    applyWorkflowEvent(start, {
      type: 'node.started',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: '2026-06-22T00:00:01.000Z',
      nodeId: 'fetch',
      nodeType: 'http.request',
    });
    expect(start).toEqual(snapshot);
  });

  it('ignores events for a different run', () => {
    const start = seed();
    const next = applyWorkflowEvent(start, {
      type: 'node.succeeded',
      workflowId: WF_ID,
      runId: 'other-run',
      at: '2026-06-22T00:00:02.000Z',
      nodeId: 'fetch',
      output: 1,
    });
    expect(next).toBe(start);
  });

  it('is a no-op for node/started/failed events with no snapshot', () => {
    expect(
      applyWorkflowEvent(null, {
        type: 'node.started',
        workflowId: WF_ID,
        runId: RUN_ID,
        at: '2026-06-22T00:00:01.000Z',
        nodeId: 'fetch',
        nodeType: 'http.request',
      }),
    ).toBeNull();
  });

  it('leaves the snapshot unchanged when the node is missing', () => {
    const start = seed();
    const next = applyWorkflowEvent(start, {
      type: 'node.succeeded',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: '2026-06-22T00:00:02.000Z',
      nodeId: 'ghost',
      output: 1,
    });
    expect(next?.nodeRuns).toEqual(start.nodeRuns);
  });
});

describe('applyWorkflowEvent — terminal events', () => {
  it('run.failed sets failed status + error but leaves node detail for backfill', () => {
    const start = applyWorkflowEvent(seed(), {
      type: 'node.failed',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: '2026-06-22T00:00:03.000Z',
      nodeId: 'fetch',
      error: 'boom',
    });
    const next = applyWorkflowEvent(start, {
      type: 'run.failed',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: '2026-06-22T00:00:04.000Z',
      error: 'workflow run failed',
    });
    expect(next?.status).toBe('failed');
    expect(next?.error).toBe('workflow run failed');
    expect(next?.finishedAt).toBe('2026-06-22T00:00:04.000Z');
    // node-level detail (the failed node) is preserved
    expect(statusOf(next, 'fetch')).toBe('failed');
  });

  it('run.finished replaces the snapshot with the authoritative run', () => {
    const authoritative: WorkflowRun = {
      ...seed(),
      status: 'succeeded',
      finishedAt: '2026-06-22T00:00:05.000Z',
      nodeRuns: [
        nodeRun('trigger', { nodeType: 'trigger.manual', status: 'succeeded' }),
        nodeRun('fetch', { status: 'succeeded', logs: [{ at: 'x', level: 'info', message: 'ok' }] }),
        nodeRun('notify', { status: 'skipped' }),
      ],
    };
    const next = applyWorkflowEvent(seed(), {
      type: 'run.finished',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: '2026-06-22T00:00:05.000Z',
      run: authoritative,
    });
    expect(next).toEqual(authoritative);
    // brings in skipped nodes + logs the event stream alone never carried
    expect(statusOf(next, 'notify')).toBe('skipped');
    expect(next?.nodeRuns.find((n) => n.nodeId === 'fetch')?.logs).toHaveLength(1);
  });

  it('run.finished can seed from a null snapshot', () => {
    const authoritative = { ...seed(), status: 'succeeded' as const };
    const next = applyWorkflowEvent(null, {
      type: 'run.finished',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: '2026-06-22T00:00:05.000Z',
      run: authoritative,
    });
    expect(next).toEqual(authoritative);
  });

  it('ignores a run.finished for a different run than the one tracked', () => {
    const start = seed();
    const next = applyWorkflowEvent(start, {
      type: 'run.finished',
      workflowId: WF_ID,
      runId: 'other-run',
      at: '2026-06-22T00:00:05.000Z',
      run: { ...seed(), id: 'other-run', status: 'succeeded' },
    });
    expect(next).toBe(start);
  });
});

describe('applyWorkflowEvent — full happy-path stream', () => {
  it('folds start → per-node transitions → finish into final state', () => {
    const events: WorkflowEvent[] = [
      { type: 'run.started', workflowId: WF_ID, runId: RUN_ID, at: 't0', triggerSource: 'manual' },
      { type: 'node.started', workflowId: WF_ID, runId: RUN_ID, at: 't1', nodeId: 'trigger', nodeType: 'trigger.manual' },
      { type: 'node.succeeded', workflowId: WF_ID, runId: RUN_ID, at: 't2', nodeId: 'trigger', output: {} },
      { type: 'node.started', workflowId: WF_ID, runId: RUN_ID, at: 't3', nodeId: 'fetch', nodeType: 'http.request' },
      { type: 'node.succeeded', workflowId: WF_ID, runId: RUN_ID, at: 't4', nodeId: 'fetch', output: { ok: true } },
      { type: 'node.started', workflowId: WF_ID, runId: RUN_ID, at: 't5', nodeId: 'notify', nodeType: 'http.request' },
      { type: 'node.succeeded', workflowId: WF_ID, runId: RUN_ID, at: 't6', nodeId: 'notify', output: { sent: true } },
    ];
    const live = fold(seed(), events);
    expect(live?.status).toBe('running'); // no run.finished yet
    expect(statusOf(live, 'trigger')).toBe('succeeded');
    expect(statusOf(live, 'fetch')).toBe('succeeded');
    expect(statusOf(live, 'notify')).toBe('succeeded');

    const done = applyWorkflowEvent(live, {
      type: 'run.finished',
      workflowId: WF_ID,
      runId: RUN_ID,
      at: 't7',
      run: { ...(live as WorkflowRun), status: 'succeeded', finishedAt: 't7' },
    });
    expect(done?.status).toBe('succeeded');
    expect(isRunTerminal(done!.status)).toBe(true);
  });
});
