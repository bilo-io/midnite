'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/**
 * A compact segmented tab control, built from the same button-radiogroup pattern
 * used elsewhere (e.g. the side-nav mode toggle). Controlled: the caller owns the
 * active value and renders the matching panel.
 */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-md border border-border/60 bg-card/60 p-0.5',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
