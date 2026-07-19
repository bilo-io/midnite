'use client';

import { useEffect, useRef } from 'react';

/** User-activity events that reset the idle countdown. */
const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Fire `onIdle` after `timeoutMs` of no user activity. The reusable mechanism
 * behind the shell's idle re-lock (Phase 73 Theme B) — the host decides what
 * "idle" does (lock the screen, dim, etc.). Any activity restarts the countdown.
 *
 * Disabled when `enabled` is false or `timeoutMs <= 0`, so a host can turn the
 * idle lock off without unmounting. `onIdle` is read through a ref, so passing a
 * fresh closure each render never resets the timer.
 */
export function useIdleTimer(timeoutMs: number, onIdle: () => void, enabled = true): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled || timeoutMs <= 0) return;

    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, reset, { passive: true });
    }
    reset();

    return () => {
      clearTimeout(timer);
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, reset);
    };
  }, [timeoutMs, enabled]);
}
