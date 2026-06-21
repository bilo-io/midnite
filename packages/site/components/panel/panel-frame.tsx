import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * macOS-window chrome shared by the persistent preview panel (Theme C) and the
 * inline mobile panels: rounded corners, subtle depth, a translucent token-driven
 * surface, and the three traffic-light dots. The body fills the remaining space so
 * a content module (Theme F) can occupy the whole frame.
 *
 * Wrapped in the `.gradient-border` treatment (globals.css): a subtle brand-gradient
 * edge at rest that becomes pronounced — pulsing glow + rotating conic gradient — on
 * hover/focus. That ring/glow lives on the OUTER element (it can't be `overflow-hidden`,
 * or the inset pseudo-elements get clipped); the INNER element does the rounded
 * clipping of the content. `pointer-events-auto` so the panel reacts to hover even
 * inside the persistent panel's pointer-events-none wrapper.
 */
export function PanelFrame({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('gradient-border pointer-events-auto h-full w-full rounded-2xl', className)}>
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-2xl backdrop-blur-md">
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#f43f5e]/80" />
          <span className="h-3 w-3 rounded-full bg-[#f59e0b]/80" />
          <span className="h-3 w-3 rounded-full bg-[#10b981]/80" />
          {title ? (
            <span className="ml-2 truncate font-mono text-xs text-muted-foreground/70">{title}</span>
          ) : null}
        </div>
        <div className="relative min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
