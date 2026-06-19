'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

type Heights = {
  /** Height when blurred and empty — trimmed of the empty rows. */
  collapsed: number;
  /** Floor height while focused — the comfortable typing size to open up to. */
  expanded: number;
  /** Hard ceiling; content taller than this scrolls inside the box. */
  max: number;
};

/**
 * Focus- and content-aware auto-sizing for a textarea. The box sits at
 * `collapsed` when blurred and empty, grows to fit its content (so pre-filled
 * text shows up to `max`), and lifts its floor to `expanded` the moment it gains
 * focus — so an empty input opens up on click. Pair the element with a CSS
 * `transition-[height]` and `overflow-y-auto` for the grow/shrink to animate and
 * for overflow past `max` to scroll.
 */
export function useAutoResizeTextarea(value: string, { collapsed, expanded, max }: Heights) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const floor = focused ? expanded : collapsed;
    // Measure the content's natural height with the box unconstrained.
    const start = el.style.height;
    el.style.height = 'auto';
    const target = Math.min(max, Math.max(floor, el.scrollHeight));
    // Restore the pre-measurement height and force a reflow so the browser keeps
    // it as the CSS transition's start value. Without this, the detour through the
    // non-interpolatable `auto` keyword cancels the transition and the box pops.
    el.style.height = start;
    void el.offsetHeight;
    el.style.height = `${target}px`;
  }, [focused, collapsed, expanded, max]);

  // Layout effect: measure + apply before paint so there's no flash on mount or
  // on each keystroke / focus change.
  useLayoutEffect(resize, [value, resize]);

  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);

  return { ref, focused, onFocus, onBlur };
}
