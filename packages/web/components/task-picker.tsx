'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TaskSummary } from '@midnite/shared';
import { cn } from '@/lib/utils';

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';

const MAX_MATCHES = 8;

/**
 * A dependency-free combobox over a set of candidate tasks (Phase 27). Filters
 * `candidates` by title as the user types and shows a small dropdown of matches;
 * picking one (click or Enter) calls `onPick` and clears the input. The parent
 * owns "selected" semantics — it filters out candidates it doesn't want shown
 * (already-selected, self, done/abandoned).
 */
export function TaskPicker({
  candidates,
  onPick,
  disabled,
  placeholder,
  label,
}: {
  candidates: TaskSummary[];
  onPick: (task: TaskSummary) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}) {
  const t = useTranslations('task');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on a click outside the combobox.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = (q ? candidates.filter((t) => t.title.toLowerCase().includes(q)) : candidates).slice(
    0,
    MAX_MATCHES,
  );

  const pick = (task: TaskSummary) => {
    onPick(task);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        aria-label={label ?? t('picker.searchAria')}
        placeholder={placeholder ?? t('picker.searchPlaceholder')}
        className={INPUT_CLASS}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const first = matches[0];
            if (first) pick(first);
          }
        }}
      />
      {open && matches.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {matches.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                // Keep the click off the input's blur race — mousedown fires first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(task)}
                className={cn(
                  'flex w-full items-center rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                )}
              >
                <span className="truncate">{task.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
