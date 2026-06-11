'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  /** Optional leading glyph (icon, logo, coloured dot, etc.). */
  icon?: React.ReactNode;
};

type Rect = { top: number; left: number; width: number };

/**
 * A controlled single-select dropdown built from app tokens (tracks the theme).
 * The menu renders in a portal with fixed positioning, so it never gets clipped
 * by an ancestor's `overflow-hidden` (accordions, modals, scroll areas).
 */
export function Select<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: {
  options: ReadonlyArray<SelectOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Reposition while open so the menu tracks the trigger on scroll/resize.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  const pick = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-1 ring-ring',
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? ''}</span>
        <span className="flex shrink-0 items-center gap-2">
          {selected?.icon ? <span className="flex shrink-0 items-center">{selected.icon}</span> : null}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </span>
      </button>

      {open && rect
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}
              className="z-[60] max-h-72 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg"
            >
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => pick(o.value)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/60',
                      on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {on ? <Check className="h-4 w-4" /> : null}
                      </span>
                      <span className="truncate">{o.label}</span>
                    </span>
                    {o.icon ? <span className="flex shrink-0 items-center">{o.icon}</span> : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
