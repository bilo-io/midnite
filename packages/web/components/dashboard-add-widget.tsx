'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useDashboardTabs, widgetsKey } from '@/lib/dashboard-tabs';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_WIDGETS, newInstance, widgetCatalog, type WidgetInstance } from '@/lib/dashboard-widgets';
import { cn } from '@/lib/utils';

/**
 * Header "+" that opens the full widget catalogue. Widgets already on the active
 * board show greyed-out (can't add twice); the rest add live. Shares the
 * enabled-widgets list with the grid purely through localStorage — the
 * `useLocalStorage` hook broadcasts same-tab writes, so adding here updates the
 * grid live without any shared parent/context.
 */
export function DashboardAddWidget() {
  // Add to whichever dashboard tab is active.
  const { activeId } = useDashboardTabs();
  const [widgets, setWidgets] = useLocalStorage<WidgetInstance[]>(widgetsKey(activeId), DEFAULT_WIDGETS);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const catalogue = widgetCatalog(widgets);

  const add = (type: WidgetInstance['type']) => {
    setWidgets((prev) => [...prev, newInstance(type)]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Add widget"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <div className="border-b border-border/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            Add a widget
          </div>
          <ul className="max-h-80 overflow-auto p-1">
            {catalogue.map(({ type, label, description, icon: Icon, added }) => (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => add(type)}
                  disabled={added}
                  aria-disabled={added}
                  title={added ? 'Already on this dashboard' : undefined}
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
                  {added && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
