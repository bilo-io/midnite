import { plural } from '@/lib/plural';
import { cn } from '@/lib/utils';

/**
 * The standard resource-count pill for list-page headers: a small rounded badge
 * showing `{count} {noun}` (e.g. "6 memories"), pinned to the far left of the
 * controls row so every resource page reads the same way. Pluralizes via
 * `plural()`; pass `pluralNoun` for irregular nouns.
 */
export function CountPill({
  count,
  noun,
  pluralNoun,
  className,
}: {
  count: number;
  noun: string;
  pluralNoun?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-muted/70 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground',
        className,
      )}
    >
      {count} {plural(count, noun, pluralNoun)}
    </span>
  );
}
