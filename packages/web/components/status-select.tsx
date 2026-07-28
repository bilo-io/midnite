'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { ALLOWED_TRANSITIONS, type Status } from '@midnite/shared';
import { statusHueVar } from '@/components/task-columns';
import { useStatusLabel } from '@/lib/i18n-labels';
import { cn } from '@/lib/utils';

function StatusDot({ hueVar }: { hueVar: string }) {
  return (
    <span
      aria-hidden
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: `hsl(var(${hueVar}))` }}
    />
  );
}

/**
 * A compact inline dropdown for a task's status. Offers the current status plus
 * its legal {@link ALLOWED_TRANSITIONS} targets, `wip` excluded — entering `wip`
 * spawns an agent session (`startTask`), not a plain status write, so that stays
 * on the dedicated Start action. A terminal status (`done`/`abandoned`) has no
 * legal targets, so it renders as a static label instead of a dropdown (mirrors
 * "reopen" being its own explicit action, not a status pick).
 */
export function StatusSelect({
  status,
  onChange,
  disabled = false,
  align = 'left',
  variant = 'inline',
}: {
  status: Status;
  onChange: (next: Status) => void;
  disabled?: boolean;
  align?: 'left' | 'right';
  /** `inline` (default) sits in dense text rows (e.g. the modal's meta line);
   *  `chip` matches `ProjectSelect`'s bordered button, for toolbar contexts. */
  variant?: 'inline' | 'chip';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const statusLabel = useStatusLabel();
  const options: Status[] = [status, ...ALLOWED_TRANSITIONS[status].filter((s) => s !== 'wip')];

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

  const pick = (next: Status) => {
    setOpen(false);
    if (next !== status) onChange(next);
  };

  if (options.length <= 1) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <StatusDot hueVar={statusHueVar(status)} />
        {statusLabel(status)}
      </span>
    );
  }

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
        <StatusDot hueVar={statusHueVar(status)} />
        {statusLabel(status)}
        <ChevronDown
          className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute top-full z-50 mt-1 w-40 rounded-md border border-border bg-card p-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {options.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={s === status}
              onClick={() => pick(s)}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent/60',
                s === status ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center">
                {s === status ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              <StatusDot hueVar={statusHueVar(s)} />
              <span className="truncate">{statusLabel(s)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
