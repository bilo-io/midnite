'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_OPS_WIDGETS,
  groupOpsWidgetCatalog,
  opsWidgetCatalog,
  OPS_WIDGETS_STORAGE_KEY,
  type OpsWidgetInstance,
  type OpsWidgetType,
} from '@/lib/ops-widgets';
import { cn } from '@/lib/utils';

/**
 * Header "+" for the Ops board — the dashboard's add-widget picker mirrored onto
 * the ops catalogue. Opens the full ops widget catalogue grouped into category
 * sections with a search box; widgets already on the board show greyed-out. Shares
 * the enabled-widgets list with {@link OpsGrid} purely through localStorage (the
 * `useLocalStorage` hook broadcasts same-tab writes), so adding here updates the
 * grid live without any shared parent/context. Kept separate from the dashboard
 * picker so the two boards' options stay mutually exclusive.
 */
export function OpsAddWidget() {
  const [widgets, setWidgets] = useLocalStorage<OpsWidgetInstance[]>(
    OPS_WIDGETS_STORAGE_KEY,
    DEFAULT_OPS_WIDGETS,
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Fresh search + focus each time the menu opens.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    searchRef.current?.focus();
  }, [open]);

  const groups = useMemo(
    () => groupOpsWidgetCatalog(opsWidgetCatalog(widgets), query),
    [widgets, query],
  );

  const add = (type: OpsWidgetType) => {
    setWidgets((prev) => (prev.some((w) => w.type === type) ? prev : [...prev, { type }]));
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Add ops widget"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg">
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
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search widgets…"
                aria-label="Search ops widgets"
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
                          title={added ? 'Already on this board' : undefined}
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
      )}
    </div>
  );
}
