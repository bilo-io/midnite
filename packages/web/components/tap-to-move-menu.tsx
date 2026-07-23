'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { Status } from '@midnite/shared';
import type { ColumnDef } from '@/components/task-columns';
import { cn } from '@/lib/utils';

/**
 * Touch fallback for moving a card between columns (Phase 24 Theme B). On a phone
 * a press-and-hold drag works, but it's finicky — this gives a guaranteed path:
 * tap the affordance, pick a target column, and the same `onMove` mutation runs.
 * Shown only on touch-width viewports (the board gates it behind `useIsMobile`),
 * so the desktop drag experience is untouched. Trigger + items are ≥44px tap
 * targets per the touch-ergonomics guideline.
 */
export function TapToMoveMenu({
  currentStatus,
  columns,
  onMove,
  className,
}: {
  currentStatus: Status;
  columns: ColumnDef[];
  onMove: (target: Status) => void;
  className?: string;
}) {
  const t = useTranslations('board');
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const targets = columns.filter((c) => c.status !== currentStatus);

  return (
    // Keep pointer-down off the drag sensor so tapping the affordance never
    // starts a drag.
    <div
      ref={ref}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn('absolute right-2 top-2 z-20', className)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={t('card.moveToColumn')}
        aria-expanded={open}
        title={t('card.moveTo')}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <ul className="p-1">
            {targets.map((col) => (
              <li key={col.status}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(col.status);
                    setOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: `hsl(var(${col.hueVar}))` }}
                  />
                  <span>{t(`columns.${col.status}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
