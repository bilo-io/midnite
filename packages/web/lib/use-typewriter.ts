'use client';

import { useEffect, useState } from 'react';

/**
 * Reveals `text` one character at a time over a fixed `duration`, so several
 * fields typed in parallel (e.g. a page title + subtitle) finish together
 * regardless of length. Returns the revealed slice and a `done` flag.
 *
 * `enabled: false` shows the full text immediately. The caller owns the
 * motion decision (see `useAnimationPrefs`, which resolves the `motion` setting
 * + OS `prefers-reduced-motion` + the per-effect toggle) and passes it in.
 */
export function useTypewriter(
  text: string,
  { duration = 700, enabled = true }: { duration?: number; enabled?: boolean } = {},
): { typed: string; done: boolean } {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!enabled || text.length === 0) {
      setTyped(text);
      return;
    }

    setTyped('');
    let index = 0;
    const step = Math.max(duration / text.length, 12);
    const id = setInterval(() => {
      index += 1;
      setTyped(text.slice(0, index));
      if (index >= text.length) clearInterval(id);
    }, step);

    return () => clearInterval(id);
  }, [text, duration, enabled]);

  return { typed, done: typed.length === text.length };
}
