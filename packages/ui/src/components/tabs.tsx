'use client';

import { type KeyboardEvent, type ReactNode, useRef } from 'react';
import { cn } from '../lib/cn';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/**
 * A compact segmented tab control, built from the same button-radiogroup pattern
 * used elsewhere (e.g. the side-nav mode toggle). Controlled: the caller owns the
 * active value and renders the matching panel.
 *
 * a11y (Phase 60 I): implements the WAI-ARIA tabs keyboard pattern — a single
 * tab stop (roving `tabindex`, only the selected tab is `0`) with ←/→ (and ↑/↓)
 * to move between tabs and Home/End to jump to the first/last, activating on
 * focus. Without this every tab was its own tab stop and arrow keys did nothing.
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
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAndSelect = (index: number) => {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    refs.current[index]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = options.findIndex((o) => o.value === value);
    if (current === -1) return;
    let next = current;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    focusAndSelect(next);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center rounded-md border border-border/60 bg-card/60 p-0.5',
        className,
      )}
    >
      {options.map((opt, i) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              selected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
