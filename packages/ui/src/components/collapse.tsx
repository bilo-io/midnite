'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Animates an accordion body open/closed by transitioning a CSS grid track
 * between `0fr` and `1fr` — height animates smoothly without measuring the
 * content, and the inner `overflow-hidden` clips it while collapsed. Respects
 * `prefers-reduced-motion`. Wrap any accordion/disclosure body in this.
 *
 * a11y (Phase 60 I): the wrapper forwards `id`/`role`/`aria-label*` so a
 * disclosure trigger can point at it via `aria-controls`, and the clipped inner
 * region is marked `inert` while collapsed — without it, controls inside a
 * closed accordion stay in the tab order and readable by screen readers even
 * though they're visually hidden.
 *
 * `bleed`: content that paints outside its box (e.g. the `gradient-border`
 * glow halo) is clipped by the inner `overflow-hidden`. With `bleed`, the clip
 * is released once the expand transition settles — the box no longer needs it
 * when fully open — and reinstated the moment it starts collapsing.
 */
export function Collapse({
  open,
  bleed = false,
  children,
  className,
  id,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: {
  open: boolean;
  bleed?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  // Tracks "fully open" — flips true a beat after the 200ms expand transition
  // completes (timer, not transitionend, so reduced-motion still settles).
  const [settled, setSettled] = useState(open);
  useEffect(() => {
    if (!open) {
      setSettled(false);
      return undefined;
    }
    const timer = setTimeout(() => setSettled(true), 240);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <div
      id={id}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className={cn(
        'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className,
      )}
    >
      {/* `inert` (React 19) drops the collapsed content out of the tab order +
          the accessibility tree, matching what `overflow-hidden` does visually. */}
      <div
        className={cn('min-h-0', bleed && open && settled ? 'overflow-visible' : 'overflow-hidden')}
        inert={!open}
      >
        {children}
      </div>
    </div>
  );
}
