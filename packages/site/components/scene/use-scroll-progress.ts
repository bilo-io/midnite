'use client';

import { useEffect, useRef } from 'react';

/**
 * Tracks normalized page scroll progress (0 at top → 1 at the bottom of the
 * scrollable range) in a ref, updated via requestAnimationFrame so reads stay
 * cheap and off the React render path. The 3D scene polls `ref.current` inside
 * its useFrame loop rather than re-rendering on every scroll event.
 */
export function useScrollProgress() {
  const progress = useRef(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

/**
 * Tracks the pointer position normalized to [-1, 1] on each axis, in a ref. Reads
 * from `window` (not the canvas) because the WebGL backdrop is pointer-events-none
 * so it never steals clicks/scroll — R3F's own `state.pointer` would stay frozen.
 */
export function usePointer() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return pointer;
}

/** True when the user has requested reduced motion. SSR-safe (defaults false). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
