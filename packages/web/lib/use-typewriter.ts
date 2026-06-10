'use client';

import { useEffect, useState } from 'react';

/** True when the user prefers reduced motion. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Reveals `text` one character at a time over a fixed `duration`, so several
 * fields typed in parallel (e.g. a page title + subtitle) finish together
 * regardless of length. Returns the revealed slice and a `done` flag.
 *
 * Honours `prefers-reduced-motion` and disabled state by showing the full text
 * immediately.
 */
export function useTypewriter(
  text: string,
  { duration = 700, enabled = true }: { duration?: number; enabled?: boolean } = {},
): { typed: string; done: boolean } {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!enabled || text.length === 0 || prefersReducedMotion()) {
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
