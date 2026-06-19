'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BrainstormRun, BrainstormSynthMode } from '@midnite/shared';
import { getBrainstormRun, startBrainstormRun } from '@/lib/api';

const TERMINAL = new Set(['completed', 'failed']);
const POLL_MS = 1200;

export interface UseBrainstormRun {
  run: BrainstormRun | null;
  running: boolean;
  error: string | null;
  start: (prompt: string, mode?: BrainstormSynthMode) => Promise<void>;
  /** Show a past (already finished) run in the same surface, read-only. */
  select: (run: BrainstormRun) => void;
  /** Adopt a run that became live again (a retry/re-synthesis) and poll it. */
  resume: (run: BrainstormRun) => void;
}

// Kicks off a run and polls the persisted run until it reaches a terminal state
// (pattern: useCouncilRun). Contributor terminals stream live over their own WS;
// this poll only tracks statuses, outputs, and the synthesis.
export function useBrainstormRun(brainstormId: string, onFinished?: () => void): UseBrainstormRun {
  const [run, setRun] = useState<BrainstormRun | null>(null);
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
          const next = await getBrainstormRun(brainstormId, runId);
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
    [brainstormId],
  );

  const start = useCallback(
    async (prompt: string, mode?: BrainstormSynthMode) => {
      setError(null);
      setRunning(true);
      try {
        const started = await startBrainstormRun(brainstormId, prompt, mode);
        if (!mounted.current) return;
        setRun(started);
        poll(started.id);
      } catch (err) {
        if (!mounted.current) return;
        setError(err instanceof Error ? err.message : 'Failed to start run');
        setRunning(false);
      }
    },
    [brainstormId, poll],
  );

  const select = useCallback((past: BrainstormRun) => {
    if (timer.current) clearTimeout(timer.current);
    setRun(past);
    setRunning(false);
    setError(null);
  }, []);

  const resume = useCallback(
    (live: BrainstormRun) => {
      if (timer.current) clearTimeout(timer.current);
      setRun(live);
      setError(null);
      if (TERMINAL.has(live.status)) {
        setRunning(false);
        return;
      }
      setRunning(true);
      poll(live.id);
    },
    [poll],
  );

  return { run, running, error, start, select, resume };
}
