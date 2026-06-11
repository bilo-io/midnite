'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Animates an accordion body open/closed by transitioning a CSS grid track
 * between `0fr` and `1fr` — height animates smoothly without measuring the
 * content, and the inner `overflow-hidden` clips it while collapsed. Respects
 * `prefers-reduced-motion`. Wrap any accordion/disclosure body in this.
 */
export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
