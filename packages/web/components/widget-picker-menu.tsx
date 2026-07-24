'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Search, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type WidgetPickerItem<TType extends string> = {
  type: TType;
  label: string;
  description: string;
  icon: LucideIcon;
  added: boolean;
};

export type WidgetPickerGroup<TType extends string> = {
  category: string;
  label: string;
  items: WidgetPickerItem<TType>[];
};

type Rect = { top: number; right: number };

type Props<TType extends string> = {
  /** Pre-grouped, pre-filtered catalogue for the current search query. */
  groups: WidgetPickerGroup<TType>[];
  query: string;
  onQueryChange: (query: string) => void;
  onAdd: (type: TType) => void;
  triggerLabel: string;
  searchLabel: string;
  /** Tooltip on an already-added item's row, e.g. "Already on this dashboard". */
  addedTitle: string;
};

/**
 * Shared "+" widget-picker dropdown for the Dashboard and Ops board headers.
 * Renders in a portal with fixed positioning (the {@link ExportMenu} convention)
 * so an open menu never affects page layout/reflow — the trigger's position is
 * captured once via `getBoundingClientRect()` and the panel floats above the
 * page in `document.body`, independent of the toolbar's flex flow.
 */
export function WidgetPickerMenu<TType extends string>({
  groups,
  query,
  onQueryChange,
  onAdd,
  triggerLabel,
  searchLabel,
  addedTitle,
}: Props<TType>) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 8, right: window.innerWidth - r.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  // Fresh search + focus each time the menu opens.
  useEffect(() => {
    if (!open) return;
    onQueryChange('');
    searchRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open, not on every onQueryChange identity change
  }, [open]);

  const add = (type: TType) => {
    onAdd(type);
    setOpen(false);
  };

  return (
    <div ref={triggerRef} className="relative">
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={triggerLabel}
        aria-expanded={open}
        className="h-9 w-9"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {open && rect
        ? createPortal(
            <div
              ref={menuRef}
              style={{ position: 'fixed', top: rect.top, right: rect.right }}
              className="z-50 w-80 rounded-lg accent-gradient-border accent-gradient-border--lit"
            >
              <div className="overflow-hidden rounded-lg bg-popover shadow-lg">
                <div className="border-b border-border/40 p-2">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      placeholder="Search widgets…"
                      aria-label={searchLabel}
                      className="w-full rounded-md border border-border/60 bg-transparent py-1.5 pl-8 pr-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="max-h-[min(60vh,28rem)] overflow-auto p-1">
                  {groups.length === 0 ? (
                    <p className="px-2.5 py-8 text-center text-sm text-muted-foreground">
                      No widgets match “{query.trim()}”.
                    </p>
                  ) : (
                    groups.map((group) => (
                      <div key={group.category} className="mb-1 last:mb-0">
                        <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {group.label}
                        </div>
                        <ul>
                          {group.items.map(({ type, label, description, icon: Icon, added }) => (
                            <li key={type}>
                              <button
                                type="button"
                                onClick={() => add(type)}
                                disabled={added}
                                aria-disabled={added}
                                title={added ? addedTitle : undefined}
                                className={cn(
                                  'flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                                  added ? 'cursor-not-allowed opacity-40' : 'hover:bg-accent',
                                )}
                              >
                                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium">{label}</span>
                                  <span className="block text-xs text-muted-foreground">{description}</span>
                                </span>
                                {added && (
                                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
