'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared chip colors so every collection's bulk actions read the same. */
export const BULK_COLORS = {
  archive: '#f59e0b', // amber/orange — archive & unarchive
  delete: '#ef4444', // red — destructive
  neutral: '#94a3b8',
} as const;

export type BulkAction = {
  key: string;
  label: string;
  /** Raw CSS color for the chip tint and text. */
  color: string;
  onClick: () => void;
};

type Props = {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  className?: string;
  /** Extra controls rendered after the action chips (e.g. a "Move to…" menu). */
  extra?: ReactNode;
};

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/**
 * A horizontal row of bulk-action chips that animates in just above a collection
 * when one or more items are selected. The chips mirror the status pills' shape
 * but carry no status dot; each is tinted with its action color and sits at
 * reduced opacity until hovered or focused, when it becomes fully opaque.
 */
export function BulkActionBar({ count, actions, onClear, className, extra }: Props) {
  const open = count > 0;
  return (
    <div
      aria-hidden={!open}
      className={cn(
        'overflow-hidden transition-all duration-200 ease-out motion-reduce:transition-none',
        open ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 pb-1 transition-transform duration-200 ease-out motion-reduce:transition-none',
          open ? 'translate-y-0' : '-translate-y-2',
        )}
      >
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <span className="tabular-nums">{count} selected</span>
          <X className="h-3 w-3" />
        </button>
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            className="rounded-full border px-3 py-1 text-xs font-medium opacity-75 transition-all hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
            style={{ borderColor: tint(a.color, 45), backgroundColor: tint(a.color, 14), color: a.color }}
          >
            {a.label}
          </button>
        ))}
        {extra}
      </div>
    </div>
  );
}
