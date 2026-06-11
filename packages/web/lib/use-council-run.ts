'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CouncilRun } from '@midnite/shared';
import { getCouncilRun, startCouncilRun } from '@/lib/api';

const TERMINAL = new Set(['completed', 'failed']);
const POLL_MS = 1200;

export interface UseCouncilRun {
  run: CouncilRun | null;
  running: boolean;
  error: string | null;
  start: (topic: string) => Promise<void>;
  /** Show a past (already finished) run in the same surface, read-only. */
  select: (run: CouncilRun) => void;
}

// Kicks off a run and polls the persisted run until it reaches a terminal state
// (pattern: useWorkflowRun). Participant terminals stream live over their own
// WS; this poll only tracks statuses, outputs, labels, and the verdict.
export function useCouncilRun(councilId: string, onFinished?: () => void): UseCouncilRun {
  const [run, setRun] = useState<CouncilRun | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

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
          const next = await getCouncilRun(councilId, runId);
          if (!mounted.current) return;
          setRun(next);
          if (TERMINAL.has(next.status)) {
            setRunning(false);
            onFinishedRef.current?.();
            return;
          }
        } catch (err) {
          if (!mounted.current) return;
          setError(err instanceof Error ? err.message : 'Failed to poll run');
        }
        timer.current = setTimeout(() => void tick(), POLL_MS);
      };
      void tick();
    },
    [councilId],
  );

  const start = useCallback(
    async (topic: string) => {
      setError(null);
      setRunning(true);
      try {
        const started = await startCouncilRun(councilId, topic);
        if (!mounted.current) return;
        setRun(started);
        poll(started.id);
      } catch (err) {
        if (!mounted.current) return;
        setError(err instanceof Error ? err.message : 'Failed to start run');
        setRunning(false);
      }
    },
    [councilId, poll],
  );

  const select = useCallback((past: CouncilRun) => {
    if (timer.current) clearTimeout(timer.current);
    setRun(past);
    setRunning(false);
    setError(null);
  }, []);

  return { run, running, error, start, select };
}
