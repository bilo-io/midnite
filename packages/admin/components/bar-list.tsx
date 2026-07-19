import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** One row in a {@link BarList}: a label, a numeric weight, and a formatted value. */
export type BarListItem = {
  key: string;
  label: ReactNode;
  /** Numeric magnitude used to size the bar (bars are scaled to the max). */
  value: number;
  /** Right-aligned formatted display value (e.g. a dollar amount). */
  display: ReactNode;
};

/**
 * A horizontal-bar breakdown (Phase 73 Theme F) — a compact, dependency-free way
 * to show "which bucket contributed what". Bars are scaled to the largest value.
 * Generic; reused for usage attribution + provider/feature splits.
 */
export function BarList({
  items,
  hueVar = '--status-wip',
  className,
}: {
  items: readonly BarListItem[];
  /** CSS var (without `hsl()`) for the bar fill; defaults to the "wip" accent. */
  hueVar?: string;
  className?: string;
}) {
  const max = items.reduce((m, it) => Math.max(m, it.value), 0);
  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {items.map((it) => {
        const pct = max > 0 ? Math.max(2, (it.value / max) * 100) : 0;
        return (
          <li key={it.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-foreground">{it.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{it.display}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: `hsl(var(${hueVar}))` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
