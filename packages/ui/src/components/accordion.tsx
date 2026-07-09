'use client';

import { type ReactNode, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapse } from './collapse';
import { cn } from '../lib/cn';

/**
 * A collapsible settings section. The shared style for every settings page —
 * an uppercase title with an optional icon, count badge and header action,
 * over a `Collapse`-animated body. Keep this the single source of truth so the
 * pages stay visually identical.
 */
export function Accordion({
  title,
  icon,
  count,
  action,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Wire the trigger to its region so assistive tech knows which content the
  // button expands, and can jump to it (Phase 60 I).
  const bodyId = useId();

  return (
    <section className="overflow-hidden rounded-lg border bg-card/60">
      {/* min-height keeps every header the same height whether or not it has an
          action button (e.g. Sub Agents' Add), so the titles align down the page. */}
      <div className="flex min-h-[3.25rem] items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              !open && '-rotate-90',
            )}
          />
          {icon ? (
            <span aria-hidden className="shrink-0 text-muted-foreground">
              {icon}
            </span>
          ) : null}
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
          {typeof count === 'number' ? (
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          ) : null}
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <Collapse open={open} id={bodyId} role="region" aria-label={title}>
        <div className="border-t border-border/60">{children}</div>
      </Collapse>
    </section>
  );
}
