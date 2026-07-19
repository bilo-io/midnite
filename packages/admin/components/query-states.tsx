import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The three non-happy data states every operator-console read renders (Phase 73
 * Theme F): a skeleton while loading, a small inline error (never a blank page),
 * and a friendly empty state. Generic — reused across all four pages.
 */

/** A shimmering placeholder block. Height/width come from `className`. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/60', className)} aria-hidden />;
}

/** A grid of skeleton cards, sized to stand in for the page's real content. */
export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

/** A stack of skeleton rows for table/list loading. */
export function LoadingRows({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

/** A compact inline error panel. `error` is coerced to a readable message. */
export function ErrorState({ error, className }: { error: unknown; className?: string }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive',
        className,
      )}
    >
      {message}
    </div>
  );
}

/** A friendly empty state for a section that loaded but has no data. */
export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}
