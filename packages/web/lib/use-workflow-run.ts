'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  WORKFLOW_WS_PATH,
  type NodeRunStatus,
  type WorkflowEvent,
  type WorkflowRun,
} from '@midnite/shared';
import { gatewayWsUrl, getWorkflowRun, runWorkflow } from '@/lib/api';

const TERMINAL = new Set(['succeeded', 'failed', 'canceled']);

export interface UseWorkflowRun {
  run: WorkflowRun | null;
  running: boolean;
  error: string | null;
  nodeStatuses: Record<string, NodeRunStatus>;
  start: () => Promise<void>;
}

// Kicks off a manual run and tracks it to a terminal state, surfacing per-node
// status. Prefers a live WebSocket subscription (instant updates); if the socket
// can't open or drops mid-run, it falls back to polling the persisted run. Either
// way the persisted run stays authoritative — events just trigger a refetch.
export function useWorkflowRun(workflowId: string): UseWorkflowRun {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const mounted = useRef(true);

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

  const refresh = useCallback(
    async (runId: string): Promise<boolean> => {
      try {
        const next = await getWorkflowRun(workflowId, runId);
        if (!mounted.current) return true;
        setRun(next);
        if (TERMINAL.has(next.status)) {
          setRunning(false);
          return true;
        }
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : 'Failed to load run');
      }
      return false;
    },
    [workflowId],
  );

  // Polling fallback — used when the WebSocket isn't available.
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

  // Live updates over the workflow WS; on any failure, degrade to polling.
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
      };
      socket.onmessage = (ev) => {
        let event: WorkflowEvent;
        try {
          event = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as WorkflowEvent;
        } catch {
          return;
        }
        if (event.runId !== runId) return;
        if (event.type === 'run.finished') {
          if (mounted.current) {
            setRun(event.run);
            setRunning(false);
          }
          cleanup();
          return;
        }
        void refresh(runId);
        if (event.type === 'run.failed') cleanup();
      };
      socket.onerror = () => {
        if (!opened) poll(runId); // never connected → poll instead
      };
      socket.onclose = () => {
        // Dropped before the run finished (and we did connect) → resume via polling.
        if (opened && mounted.current && running) poll(runId);
      };
    },
    [cleanup, poll, refresh, running],
  );

  const start = useCallback(async () => {
    setError(null);
    setRunning(true);
    cleanup();
    try {
      const started = await runWorkflow(workflowId);
      if (!mounted.current) return;
      setRun(started);
      subscribe(started.id);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : 'Failed to start run');
      setRunning(false);
    }
  }, [workflowId, cleanup, subscribe]);

  const nodeStatuses: Record<string, NodeRunStatus> = {};
  for (const nr of run?.nodeRuns ?? []) nodeStatuses[nr.nodeId] = nr.status;

  return { run, running, error, nodeStatuses, start };
}
