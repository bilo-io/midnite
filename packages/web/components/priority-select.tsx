'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITIES = [0, 1, 2, 3] as const;
const PRIORITY_KEY: Record<number, 'low' | 'normal' | 'high' | 'urgent'> = {
  0: 'low',
  1: 'normal',
  2: 'high',
  3: 'urgent',
};
const PRIORITY_DOT_CLASS: Record<number, string> = {
  0: 'bg-muted-foreground/50',
  1: 'bg-foreground/40',
  2: 'bg-amber-500',
  3: 'bg-destructive',
};

function PriorityDot({ priority }: { priority: number }) {
  return (
    <span
      aria-hidden
      className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT_CLASS[priority])}
    />
  );
}

/** A compact inline dropdown for a task's scheduling priority (0 Low – 3 Urgent). */
export function PrioritySelect({
  priority,
  onChange,
  disabled = false,
  align = 'left',
  variant = 'inline',
}: {
  priority: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  align?: 'left' | 'right';
  /** `inline` (default) sits in dense text rows (e.g. the modal's meta line);
   *  `chip` matches `ProjectSelect`'s bordered button, for toolbar contexts. */
  variant?: 'inline' | 'chip';
}) {
  const t = useTranslations('board');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (next: number) => {
    setOpen(false);
    if (next !== priority) onChange(next);
  };

  return (
    <div ref={ref} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'chip'
            ? 'h-8 gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent/50'
            : 'gap-1 rounded px-1 py-0.5 hover:bg-accent/50',
          open && 'bg-accent/60',
        )}
      >
        <PriorityDot priority={priority} />
        {t(`priority.${PRIORITY_KEY[priority] ?? 'normal'}`)}
        <ChevronDown
          className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute top-full z-50 mt-1 w-36 rounded-md border border-border bg-card p-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              role="option"
              aria-selected={p === priority}
              onClick={() => pick(p)}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent/60',
                p === priority ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center">
                {p === priority ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              <PriorityDot priority={p} />
              <span className="truncate">{t(`priority.${PRIORITY_KEY[p]}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
