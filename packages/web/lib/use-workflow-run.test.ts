import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { WorkflowEvent, WorkflowRun } from '@midnite/shared';

import { useWorkflowRun } from './use-workflow-run';

const RUN_ID = 'run-1';
const WF_ID = 'wf-1';

const runWorkflow = vi.fn();
const getWorkflowRun = vi.fn();

vi.mock('./api', () => ({
  runWorkflow: (...args: unknown[]) => runWorkflow(...args),
  getWorkflowRun: (...args: unknown[]) => getWorkflowRun(...args),
  gatewayWsUrl: () => 'ws://localhost:9999',
}));

// A controllable WebSocket stub: the hook constructs one, we drive its lifecycle.
class FakeWebSocket {
  static last: FakeWebSocket | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  closed = false;
  constructor(public url: string) {
    FakeWebSocket.last = this;
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  // Test helpers
  open() {
    this.onopen?.();
  }
  emit(event: WorkflowEvent) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
  emitRaw(data: string) {
    this.onmessage?.({ data });
  }
}

function seededRun(): WorkflowRun {
  return {
    id: RUN_ID,
    workflowId: WF_ID,
    status: 'running',
    triggerSource: 'manual',
    startedAt: 't0',
    nodeRuns: [
      { id: 'nr-trigger', runId: RUN_ID, nodeId: 'trigger', nodeType: 'trigger.manual', status: 'pending', logs: [] },
      { id: 'nr-fetch', runId: RUN_ID, nodeId: 'fetch', nodeType: 'http.request', status: 'pending', logs: [] },
    ],
  };
}

const nodeStarted = (nodeId: string): WorkflowEvent => ({
  type: 'node.started',
  workflowId: WF_ID,
  runId: RUN_ID,
  at: 't1',
  nodeId,
  nodeType: 'http.request',
});
const nodeSucceeded = (nodeId: string, output: unknown): WorkflowEvent => ({
  type: 'node.succeeded',
  workflowId: WF_ID,
  runId: RUN_ID,
  at: 't2',
  nodeId,
  output,
});

describe('useWorkflowRun', () => {
  beforeEach(() => {
    runWorkflow.mockReset();
    getWorkflowRun.mockReset();
    runWorkflow.mockResolvedValue(seededRun());
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
    FakeWebSocket.last = null;
  });
  afterEach(() => vi.unstubAllGlobals());

  async function startRun() {
    const view = renderHook(() => useWorkflowRun(WF_ID));
    await act(async () => {
      await view.result.current.start();
    });
    return view;
  }

  it('seeds the run from REST and subscribes over WS', async () => {
    const { result } = await startRun();
    expect(result.current.run?.id).toBe(RUN_ID);
    expect(result.current.running).toBe(true);
    const sock = FakeWebSocket.last!;
    act(() => sock.open());
    expect(sock.sent).toEqual([JSON.stringify({ type: 'subscribe', runId: RUN_ID })]);
  });

  it('applies node events incrementally without re-fetching the run', async () => {
    const { result } = await startRun();
    const sock = FakeWebSocket.last!;
    act(() => sock.open());

    act(() => sock.emit(nodeStarted('fetch')));
    expect(result.current.nodeStatuses.fetch).toBe('running');

    act(() => sock.emit(nodeSucceeded('fetch', { ok: true })));
    expect(result.current.nodeStatuses.fetch).toBe('succeeded');
    expect(result.current.run?.nodeRuns.find((n) => n.nodeId === 'fetch')?.output).toEqual({
      ok: true,
    });

    // The whole point: no REST refetch per event.
    expect(getWorkflowRun).not.toHaveBeenCalled();
  });

  it('ignores events for a different run and malformed frames', async () => {
    const { result } = await startRun();
    const sock = FakeWebSocket.last!;
    act(() => sock.open());

    act(() => sock.emitRaw('not json'));
    act(() =>
      sock.emit({ ...nodeSucceeded('fetch', 1), runId: 'other' } as WorkflowEvent),
    );
    expect(result.current.nodeStatuses.fetch).toBe('pending');
    expect(getWorkflowRun).not.toHaveBeenCalled();
  });

  it('finishes from the run.finished event without REST', async () => {
    const { result } = await startRun();
    const sock = FakeWebSocket.last!;
    act(() => sock.open());

    const finalRun: WorkflowRun = {
      ...seededRun(),
      status: 'succeeded',
      finishedAt: 't9',
      nodeRuns: seededRun().nodeRuns.map((nr) => ({ ...nr, status: 'succeeded' as const })),
    };
    act(() =>
      sock.emit({ type: 'run.finished', workflowId: WF_ID, runId: RUN_ID, at: 't9', run: finalRun }),
    );

    expect(result.current.running).toBe(false);
    expect(result.current.run?.status).toBe('succeeded');
    expect(sock.closed).toBe(true);
    expect(getWorkflowRun).not.toHaveBeenCalled();
  });

  it('reconciles once over REST on run.failed (no run body in the event)', async () => {
    const base = seededRun();
    const failedRun: WorkflowRun = {
      ...base,
      status: 'failed',
      error: 'boom',
      nodeRuns: base.nodeRuns.map((nr) =>
        nr.nodeId === 'fetch'
          ? { ...nr, status: 'failed' as const, error: 'boom' }
          : { ...nr, status: 'succeeded' as const },
      ),
    };
    getWorkflowRun.mockResolvedValue(failedRun);

    const { result } = await startRun();
    const sock = FakeWebSocket.last!;
    act(() => sock.open());

    await act(async () => {
      sock.emit({ type: 'run.failed', workflowId: WF_ID, runId: RUN_ID, at: 't9', error: 'boom' });
    });

    await waitFor(() => expect(result.current.run?.status).toBe('failed'));
    expect(result.current.running).toBe(false);
    expect(getWorkflowRun).toHaveBeenCalledTimes(1); // single reconcile, not per-event polling
    expect(result.current.run?.error).toBe('boom');
  });

  it('falls back to polling when the socket never opens', async () => {
    getWorkflowRun.mockResolvedValue({ ...seededRun(), status: 'succeeded' });
    const { result } = await startRun();
    const sock = FakeWebSocket.last!;

    await act(async () => {
      sock.onerror?.(); // error before open → poll
    });

    await waitFor(() => expect(getWorkflowRun).toHaveBeenCalled());
    await waitFor(() => expect(result.current.running).toBe(false));
  });
});
