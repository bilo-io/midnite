'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export type FilterOption = {
  value: string;
  label: string;
  /** HSL triple ("142 71% 45%") or a CSS var ref ("var(--status-done)"), used inside hsl(...). */
  hue: string;
};

type FilterPillsProps = {
  options: FilterOption[];
  /** Query-string key the active values are written to. Defaults to "status". */
  paramKey?: string;
  /** Label for the pill that clears all filters. */
  allLabel?: string;
  className?: string;
};

/**
 * A row of toggleable filter pills backed by the URL query string. Selecting pills
 * narrows the view to those values; the "All" pill clears the filter. Each pill is
 * tinted with the hue of the thing it filters. The query param is the source of truth,
 * so filters are shareable and link-driven (e.g. /board?status=backlog).
 */
export function FilterPills({
  options,
  paramKey = 'status',
  allLabel = 'All',
  className,
}: FilterPillsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const valid = new Set(options.map((o) => o.value));
  const raw = searchParams.get(paramKey);
  const active = new Set((raw ? raw.split(',') : []).filter((v) => valid.has(v)));
  const noneActive = active.size === 0;

  const apply = useCallback(
    (next: Set<string>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.size === 0) {
        params.delete(paramKey);
      } else {
        // Preserve option order rather than insertion order for stable URLs.
        params.set(paramKey, options.filter((o) => next.has(o.value)).map((o) => o.value).join(','));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, paramKey, options],
  );

  const toggle = (value: string) => {
    const next = new Set(active);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => apply(new Set())}
        aria-pressed={noneActive}
        className={cn(
          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          noneActive
            ? 'border-foreground/20 bg-accent text-accent-foreground'
            : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )}
      >
        {allLabel}
      </button>
      {options.map((o) => {
        const on = active.has(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            aria-pressed={on}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              on
                ? 'text-foreground'
                : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
            style={
              on
                ? { borderColor: `hsl(${o.hue} / 0.5)`, backgroundColor: `hsl(${o.hue} / 0.15)` }
                : undefined
            }
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: `hsl(${o.hue})`,
                boxShadow: on ? `0 0 8px -1px hsl(${o.hue} / 0.7)` : undefined,
              }}
            />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
