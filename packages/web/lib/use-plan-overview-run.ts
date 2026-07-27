'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OverviewRunResponse } from '@midnite/shared';
import { getProjectPlanOverviewRun, startProjectPlanOverviewRun } from '@/lib/api';

const TERMINAL = new Set(['done', 'error']);
const POLL_MS = 1200;

export interface UsePlanOverviewRun {
  run: OverviewRunResponse | null;
  /** The managed-run PTY to mount `LiveTerminal` against, once a run has started. */
  terminalId: string | null;
  running: boolean;
  error: string | null;
  start: (docIds: string[]) => Promise<void>;
}

// Kicks off a draft-plan Stage 1 overview run and polls the persisted row until
// it settles (pattern: useCouncilRun). The PTY itself streams live over its own
// WS (LiveTerminal); this poll only tracks status/output/error.
export function usePlanOverviewRun(projectId: string): UsePlanOverviewRun {
  const [run, setRun] = useState<OverviewRunResponse | null>(null);
  const [terminalId, setTerminalId] = useState<string | null>(null);
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
          const next = await getProjectPlanOverviewRun(projectId, runId);
          if (!mounted.current) return;
          setRun(next);
          if (TERMINAL.has(next.status)) {
            setRunning(false);
            return;
          }
        } catch (err) {
          if (!mounted.current) return;
          setError(err instanceof Error ? err.message : 'Failed to poll overview run');
          setRunning(false);
          return;
        }
        timer.current = setTimeout(() => void tick(), POLL_MS);
      };
      void tick();
    },
    [projectId],
  );

  const start = useCallback(
    async (docIds: string[]) => {
      if (timer.current) clearTimeout(timer.current);
      setError(null);
      setRunning(true);
      setRun({ status: 'running' });
      try {
        const started = await startProjectPlanOverviewRun(projectId, docIds);
        if (!mounted.current) return;
        setTerminalId(started.terminalId);
        poll(started.runId);
      } catch (err) {
        if (!mounted.current) return;
        setError(err instanceof Error ? err.message : 'Failed to start overview run');
        setRunning(false);
      }
    },
    [projectId, poll],
  );

  return { run, terminalId, running, error, start };
}
