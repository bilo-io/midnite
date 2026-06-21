'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  WORKFLOW_WS_PATH,
  applyWorkflowEvent,
  isRunTerminal,
  type NodeRunStatus,
  type WorkflowEvent,
  type WorkflowRun,
} from '@midnite/shared';
import { gatewayWsUrl, getWorkflowRun, runWorkflow } from '@/lib/api';

export interface UseWorkflowRun {
  run: WorkflowRun | null;
  running: boolean;
  error: string | null;
  nodeStatuses: Record<string, NodeRunStatus>;
  start: () => Promise<void>;
}

// Kicks off a manual run and tracks it to a terminal state, surfacing per-node status.
// The live path folds each WorkflowEvent into local run state via the shared reducer —
// no REST refetch per event. REST is the initial seed (the started run, with every node
// pending), the reconnect/backfill path when the socket drops, and a single reconcile on
// `run.failed` (which carries no run body) to pull authoritative skipped/log detail.
export function useWorkflowRun(workflowId: string): UseWorkflowRun {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const mounted = useRef(true);
  // Read inside socket callbacks to avoid stale-closure reads of `running`.
  const runningRef = useRef(false);
  // Set once a terminal event settles the run, so a slower in-flight connect-time
  // backfill can't clobber the final state with a stale snapshot.
  const terminalRef = useRef(false);
  const setRunningBoth = useCallback((value: boolean) => {
    runningRef.current = value;
    setRunning(value);
  }, []);

  const cleanup = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.close();
      ws.current = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Pull the persisted run over REST — the connect-time backfill, the polling fallback
  // tick, and the post-failure reconcile. Returns true once the run is terminal.
  // `respectTerminal` makes the backfill bow out if a terminal event already settled the
  // run while this fetch was in flight (avoids clobbering the final state with a stale
  // snapshot); the deliberate reconcile/poll callers leave it off so their pull applies.
  const refresh = useCallback(
    async (runId: string, respectTerminal = false): Promise<boolean> => {
      if (respectTerminal && terminalRef.current) return true;
      try {
        const next = await getWorkflowRun(workflowId, runId);
        if (!mounted.current || (respectTerminal && terminalRef.current)) return true;
        setRun(next);
        if (isRunTerminal(next.status)) {
          terminalRef.current = true;
          setRunningBoth(false);
          return true;
        }
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : 'Failed to load run');
      }
      return false;
    },
    [workflowId, setRunningBoth],
  );

  // Polling fallback — used when the WebSocket can't open or drops mid-run.
  const poll = useCallback(
    (runId: string) => {
      const tick = async () => {
        const done = await refresh(runId);
        if (done || !mounted.current) return;
        timer.current = setTimeout(() => void tick(), 1200);
      };
      void tick();
    },
    [refresh],
  );

  // Live updates over the workflow WS; fold each event into local state via the reducer.
  // On any connection failure, degrade to polling.
  const subscribe = useCallback(
    (runId: string) => {
      let opened = false;
      let socket: WebSocket;
      try {
        socket = new WebSocket(gatewayWsUrl() + WORKFLOW_WS_PATH);
      } catch {
        poll(runId);
        return;
      }
      ws.current = socket;
      socket.onopen = () => {
        opened = true;
        socket.send(JSON.stringify({ type: 'subscribe', runId }));
        // The run starts server-side before this handshake completes, so the trigger
        // node's events (and, for a trigger-only/instant run, the terminal event) fire
        // before we subscribe and there's no replay. Backfill once on connect to catch
        // up; live events then apply incrementally on top.
        void refresh(runId, true);
      };
      socket.onmessage = (ev) => {
        let event: WorkflowEvent;
        try {
          event = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as WorkflowEvent;
        } catch {
          return;
        }
        if (event.runId !== runId || !mounted.current) return;

        // Apply incrementally — node transitions and outputs land without re-fetching.
        setRun((prev) => applyWorkflowEvent(prev, event));

        if (event.type === 'run.finished') {
          terminalRef.current = true;
          setRunningBoth(false);
          cleanup();
        } else if (event.type === 'run.failed') {
          terminalRef.current = true;
          setRunningBoth(false);
          // The run.failed event carries no run body; reconcile once over REST to pull the
          // authoritative skipped-node statuses + per-node logs the stream doesn't carry.
          void refresh(runId);
          cleanup();
        }
      };
      socket.onerror = () => {
        if (!opened) poll(runId); // never connected → poll instead
      };
      socket.onclose = () => {
        // Dropped before the run finished (and we did connect) → resume via polling.
        if (opened && mounted.current && runningRef.current) poll(runId);
      };
    },
    [cleanup, poll, refresh, setRunningBoth],
  );

  const start = useCallback(async () => {
    setError(null);
    terminalRef.current = false;
    setRunningBoth(true);
    cleanup();
    try {
      const started = await runWorkflow(workflowId);
      if (!mounted.current) return;
      setRun(started);
      subscribe(started.id);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : 'Failed to start run');
      setRunningBoth(false);
    }
  }, [workflowId, cleanup, subscribe, setRunningBoth]);

  const nodeStatuses: Record<string, NodeRunStatus> = {};
  for (const nr of run?.nodeRuns ?? []) nodeStatuses[nr.nodeId] = nr.status;

  return { run, running, error, nodeStatuses, start };
}
