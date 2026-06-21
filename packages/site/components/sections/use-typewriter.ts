'use client';

import { useEffect, useState } from 'react';

import { prefersReducedMotion } from '@/lib/reduced-motion';

export type UseTypewriterOptions = {
  /** The full string to type out. */
  text: string;
  /** Begin typing when true; while false the hook stays empty. Default true. */
  start?: boolean;
  /** Milliseconds per character. Default 26 (≈38 chars/sec — quick, per the plan). */
  speed?: number;
  /** Milliseconds to wait before the first character. Default 0. */
  startDelay?: number;
};

export type TypewriterState = {
  /** The substring typed so far. */
  displayed: string;
  /** True once the whole string has been typed (or immediately, reduced-motion). */
  done: boolean;
};

/**
 * Types a string out character-by-character once `start` is true. SSR-safe (renders
 * empty on the server / first paint, then fills in). Under `prefers-reduced-motion`
 * the full string appears at once with no animation. Re-runs from the start whenever
 * `text`/`start` change, so callers latch `start` to get type-once behaviour.
 */
export function useTypewriter({
  text,
  start = true,
  speed = 26,
  startDelay = 0,
}: UseTypewriterOptions): TypewriterState {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!start) return;

    if (prefersReducedMotion() || text.length === 0) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed('');
    setDone(false);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        setDone(true);
        return;
      }
      timer = setTimeout(tick, speed);
    };
    timer = setTimeout(tick, startDelay);
    return () => clearTimeout(timer);
  }, [text, start, speed, startDelay]);

  return { displayed, done };
}
