'use client';

import { useEffect, useState } from 'react';

import { prefersReducedMotion } from '@/lib/reduced-motion';

export type TitlePair = { title: string; subtitle: string };

export type TypewriterCycleState = {
  index: number;
  title: string;
  subtitle: string;
  /** True while characters are being typed (drives the caret). */
  typing: boolean;
};

export type UseTypewriterCycleOptions = {
  /** ms per title character. */
  titleSpeed?: number;
  /** ms per subtitle character. */
  subtitleSpeed?: number;
  /** ms to hold a completed pair before clearing. */
  hold?: number;
};

/**
 * Cycles through title/subtitle pairs: types the title, then the subtitle, holds the
 * completed pair, clears, and advances — looping forever. Built for the hero (E2).
 *
 * Pass a STABLE `pairs` array (module constant) — it's an effect dependency, so a new
 * array each render would restart the cycle. Under reduced motion the first pair is
 * shown in full with no animation.
 */
export function useTypewriterCycle(
  pairs: TitlePair[],
  { titleSpeed = 55, subtitleSpeed = 28, hold = 2200 }: UseTypewriterCycleOptions = {},
): TypewriterCycleState {
  const [state, setState] = useState<TypewriterCycleState>(() => ({
    index: 0,
    title: '',
    subtitle: '',
    typing: true,
  }));

  useEffect(() => {
    if (pairs.length === 0) return;

    if (prefersReducedMotion()) {
      const first = pairs[0]!;
      setState({ index: 0, title: first.title, subtitle: first.subtitle, typing: false });
      return;
    }

    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });

    async function loop() {
      let i = 0;
      while (!cancelled) {
        const pair = pairs[i % pairs.length]!;
        for (let n = 1; n <= pair.title.length; n++) {
          if (cancelled) return;
          setState({ index: i, title: pair.title.slice(0, n), subtitle: '', typing: true });
          await wait(titleSpeed);
        }
        for (let n = 1; n <= pair.subtitle.length; n++) {
          if (cancelled) return;
          setState({ index: i, title: pair.title, subtitle: pair.subtitle.slice(0, n), typing: true });
          await wait(subtitleSpeed);
        }
        if (cancelled) return;
        setState({ index: i, title: pair.title, subtitle: pair.subtitle, typing: false });
        await wait(hold);
        if (cancelled) return;
        setState({ index: i, title: '', subtitle: '', typing: true });
        await wait(320);
        i += 1;
      }
    }

    void loop();
    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [pairs, titleSpeed, subtitleSpeed, hold]);

  return state;
}
