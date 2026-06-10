'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { Project } from '@midnite/shared';
import { cn } from '@/lib/utils';

type ProjectOption = Pick<Project, 'id' | 'name' | 'tag' | 'color'>;

/**
 * A controlled single-select for a task's project, including a "No project"
 * option that clears it (value `null`). Built from app tokens so it tracks the
 * theme; mirrors ProjectMultiSelect's look but isn't URL-backed.
 */
export function ProjectSelect({
  projects,
  value,
  onChange,
  disabled = false,
  placeholder = 'No project',
  align = 'left',
  direction = 'down',
  className,
}: {
  projects: ProjectOption[];
  value: string | null;
  onChange: (projectId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Which edge the dropdown panel aligns to. */
  align?: 'left' | 'right';
  /** Whether the panel opens below the trigger or above it. */
  direction?: 'down' | 'up';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? projects.find((p) => p.id === value) ?? null : null;

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

  const pick = (projectId: string | null) => {
    onChange(projectId);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-8 max-w-[12rem] items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-1 ring-ring',
        )}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-1.5 text-foreground">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: selected.color }}
            />
            <span className="truncate">{selected.name || selected.tag}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 max-h-72 w-56 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            onClick={() => pick(null)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center">
              {value === null ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            {placeholder}
          </button>
          {projects.map((p) => {
            const on = p.id === value;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => pick(p.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent/60',
                  on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center">
                  {on ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: p.color }}
                />
                <span className="truncate">{p.name || p.tag}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
