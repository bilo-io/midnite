import { cn } from '@/lib/utils';

/**
 * The standard resource-count pill for list-page headers: a small rounded badge
 * showing `{count} items` (e.g. "6 items"), pinned to the far left of the
 * controls row so every resource page reads the same way — the count is what
 * matters, not the noun, so it's uniform across Projects, Sessions, Tasks, etc.
 * Reflects the filtered count when a filter/search is active.
 */
export function CountPill({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-muted/70 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground',
        className,
      )}
    >
      {count} {count === 1 ? 'item' : 'items'}
    </span>
  );
}
