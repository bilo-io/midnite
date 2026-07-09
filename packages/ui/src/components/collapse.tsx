'use client';

import type { ReactNode } from 'react';
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
 */
export function Collapse({
  open,
  children,
  className,
  id,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
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
      <div className="min-h-0 overflow-hidden" inert={!open}>
        {children}
      </div>
    </div>
  );
}
