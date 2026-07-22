'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The sticky list-page controls row (Phase 81 follow-up) — wraps the
 * count-pill / search / view-toggle / new-button row every resource list page
 * renders under its `PageHeader`, and pins it while the list scrolls so the
 * controls are never off screen.
 *
 * `top-12` (48px) is a lockstep invariant, not a free choice: the collapsed
 * `PageHeader` holds exactly 48px (stuck at -1px) and the frameless desktop
 * title bar is 48px, so this one offset lands the toolbar flush under the
 * collapsed header in a browser AND flush under the title bar on desktop.
 */
export function StickyToolbar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        // -mx/px keep the hit area flush with the container edge while the
        // blurred surface bleeds slightly past the content for legibility over
        // cards scrolling beneath. The surface is pure backdrop-blur (no tint);
        // the translucent bg only kicks in where backdrop-filter is unsupported.
        'sticky top-12 z-20 -mx-2 flex flex-wrap items-center justify-between gap-3 gap-y-2 rounded-lg bg-background/80 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-transparent',
        className,
      )}
    >
      {children}
    </div>
  );
}
