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
  variant = 'card',
  children,
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  action?: ReactNode;
  defaultOpen?: boolean;
  /**
   * How much chrome the section wears:
   * - `card` (default): a bordered glass card wraps header + body, split by a
   *   divider — the settings-page look.
   * - `bare`: no frame around header or body; the title gets a trailing rule that
   *   runs to the end of the header (like the sidenav section headers), and the
   *   body floats with no top border.
   */
  variant?: 'card' | 'bare';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Wire the trigger to its region so assistive tech knows which content the
  // button expands, and can jump to it (Phase 60 I).
  const bodyId = useId();
  const bare = variant === 'bare';

  return (
    <section className={cn(!bare && 'overflow-hidden rounded-lg border bg-card/60')}>
      {/* card: min-height keeps every header the same height whether or not it has
          an action, so titles align down a settings page. bare: a tighter header. */}
      <div
        className={cn(
          'flex items-center gap-2 px-3',
          bare ? 'py-2' : 'min-h-[3.25rem] py-2.5',
        )}
      >
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
          <h2 className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
          {typeof count === 'number' ? (
            <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          ) : null}
          {/* Rule fills the width to the right of the title, mirroring the sidenav
              section headers. */}
          {bare ? <span aria-hidden className="h-px flex-1 bg-border/60" /> : null}
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <Collapse open={open} id={bodyId} role="region" aria-label={title}>
        <div className={cn(!bare && 'border-t border-border/60')}>{children}</div>
      </Collapse>
    </section>
  );
}
