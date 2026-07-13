import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export type GradientGlowTrigger = 'focus' | 'hover' | 'always';

export interface GradientGlowProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * When the animated border + halo lights up:
   * - `focus` (default) — glows while a descendant is focused (`:focus-within`);
   *   the behaviour the composers rely on.
   * - `hover` — glows on pointer hover (the assistant FAB at rest).
   * - `always` — glows unconditionally (the expanded assistant panel).
   */
  trigger?: GradientGlowTrigger;
}

const triggerClass: Record<GradientGlowTrigger, string | undefined> = {
  focus: undefined,
  hover: 'gradient-border--hover',
  always: 'gradient-border--always',
};

/**
 * The app's signature gradient border + glow halo, promoted from web's
 * `globals.css` into the design system so `web` and `docs` share one source
 * (Phase 66 Theme B). A wrapper element: it renders the animated frame around
 * its children and lights up per `trigger`. Reduced motion is honoured by the
 * token CSS (`@midnite/ui/styles`), which the consumer must import.
 */
export const GradientGlow = forwardRef<HTMLDivElement, GradientGlowProps>(
  function GradientGlow({ trigger = 'focus', className, ...rest }, ref) {
    return (
      <div ref={ref} className={cn('gradient-border', triggerClass[trigger], className)} {...rest} />
    );
  },
);
