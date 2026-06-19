'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CouncilFormat, CouncilRun } from '@midnite/shared';
import { getCouncilRun, retryCouncilSynthesis, startCouncilRun } from '@/lib/api';

const TERMINAL = new Set(['completed', 'failed']);
const POLL_MS = 1200;

export interface UseCouncilRun {
  run: CouncilRun | null;
  running: boolean;
  error: string | null;
  start: (prompt: string, format?: CouncilFormat) => Promise<void>;
  /** Re-synthesize the shown run's captured responses in a (possibly new) format. */
  retrySynthesis: (format?: CouncilFormat) => Promise<void>;
  /** Show a past (already finished) run in the same surface, read-only. */
  select: (run: CouncilRun) => void;
  /** Adopt a run that became live again (a retry/re-synthesis) and poll it. */
  resume: (run: CouncilRun) => void;
}

// Kicks off a run and polls the persisted run until it reaches a terminal state
// (pattern: useBrainstormRun). Member terminals stream live over their own WS;
// this poll only tracks statuses, outputs, and the synthesis.
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
    async (prompt: string, format?: CouncilFormat) => {
      setError(null);
      setRunning(true);
      try {
        const started = await startCouncilRun(councilId, prompt, format);
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

  // Re-synthesize the *currently shown* run's captured responses, optionally in a
  // new format. The run goes live again (synthesizing), so adopt it and resume the
  // poll until it settles.
  const retrySynthesis = useCallback(
    async (format?: CouncilFormat) => {
      const current = run;
      if (!current) return;
      setError(null);
      setRunning(true);
      try {
        const updated = await retryCouncilSynthesis(councilId, current.id, format);
        if (!mounted.current) return;
        setRun(updated);
        if (TERMINAL.has(updated.status)) {
          setRunning(false);
          onFinishedRef.current?.();
          return;
        }
        poll(updated.id);
      } catch (err) {
        if (!mounted.current) return;
        setError(err instanceof Error ? err.message : 'Failed to re-synthesize');
        setRunning(false);
      }
    },
    [councilId, run, poll],
  );

  const select = useCallback((past: CouncilRun) => {
    if (timer.current) clearTimeout(timer.current);
    setRun(past);
    setRunning(false);
    setError(null);
  }, []);

  const resume = useCallback(
    (live: CouncilRun) => {
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

  return { run, running, error, start, retrySynthesis, select, resume };
}
