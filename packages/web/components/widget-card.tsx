'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared chrome for the catalogue-added dashboard widgets (news, weather, clock,
 * date). Fills the grid panel height and matches the bordered-card styling of the
 * Notes/Routines panels. The grid wrapper supplies drag + remove affordances, so
 * this only owns the title row and body.
 */
export function WidgetCard({
  title,
  icon: Icon,
  actions,
  children,
  bodyClassName,
}: {
  title: string;
  icon: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </div>
  );
}
