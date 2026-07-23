'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { TaskSummary } from '@midnite/shared';
import { cn } from '@/lib/utils';

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';

const MAX_MATCHES = 8;

type Rect = { top: number; left: number; width: number };

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
  const [rect, setRect] = useState<Rect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // The list renders in a portal with fixed positioning so it never gets
  // trapped behind sibling content by an ancestor's stacking context (e.g. a
  // backdrop-blur card) or clipped by an ancestor's overflow.
  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  // Close on a click outside the combobox (input or portalled list).
  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, place]);

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
        ref={inputRef}
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
      {open && rect && matches.length > 0
        ? createPortal(
            <ul
              ref={listRef}
              style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}
              className="z-[60] max-h-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
            >
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
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
