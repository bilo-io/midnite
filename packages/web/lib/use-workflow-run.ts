'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeRunStatus, WorkflowRun } from '@midnite/shared';
import { getWorkflowRun, runWorkflow } from '@/lib/api';

const TERMINAL = new Set(['succeeded', 'failed', 'canceled']);

export interface UseWorkflowRun {
  run: WorkflowRun | null;
  running: boolean;
  error: string | null;
  nodeStatuses: Record<string, NodeRunStatus>;
  start: () => Promise<void>;
}

// Kicks off a manual run and polls the persisted run until it reaches a terminal state,
// surfacing per-node status. Designed so the realtime phase can swap polling for a
// WebSocket subscription behind this same surface.
export function useWorkflowRun(workflowId: string): UseWorkflowRun {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const poll = useCallback(
    (runId: string) => {
      const tick = async () => {
        try {
          const next = await getWorkflowRun(workflowId, runId);
          if (!mounted.current) return;
          setRun(next);
          if (TERMINAL.has(next.status)) {
            setRunning(false);
            return;
          }
        } catch (err) {
          if (!mounted.current) return;
          setError(err instanceof Error ? err.message : 'Failed to poll run');
        }
        timer.current = setTimeout(() => void tick(), 1200);
      };
      void tick();
    },
    [workflowId],
  );

  const start = useCallback(async () => {
    setError(null);
    setRunning(true);
    try {
      const started = await runWorkflow(workflowId);
      if (!mounted.current) return;
      setRun(started);
      poll(started.id);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : 'Failed to start run');
      setRunning(false);
    }
  }, [workflowId, poll]);

  const nodeStatuses: Record<string, NodeRunStatus> = {};
  for (const nr of run?.nodeRuns ?? []) nodeStatuses[nr.nodeId] = nr.status;

  return { run, running, error, nodeStatuses, start };
}
