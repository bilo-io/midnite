'use client';

import type { ReactNode } from 'react';
import { Plus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  /** The collection's resource icon, shown in the decorative tile. */
  Icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Convenience CTA: renders the large pill "+ {actionLabel}" button. */
  actionLabel?: string;
  onAction?: () => void;
  /** Custom action node, used instead of actionLabel/onAction (e.g. a menu button). */
  action?: ReactNode;
  className?: string;
};

/**
 * The shared empty state for every collection: a dashed panel with the resource
 * icon in a soft tile, a heading + hint, and a prominent pill add-button whose
 * plus rotates on hover. Pass `action` for a non-button CTA.
 */
export function EmptyState({
  Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 surface-glass px-6 py-16 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="relative">
          {/* soft glow behind the tile */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-2xl bg-foreground/5 blur-xl"
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/70 text-muted-foreground shadow-sm">
            <Icon className="h-7 w-7" />
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {action ??
        (actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="group mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            {actionLabel}
          </button>
        ) : null)}
    </div>
  );
}
