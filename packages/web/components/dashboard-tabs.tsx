'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MAX_DASHBOARDS, useDashboardTabs } from '@/lib/dashboard-tabs';
import { cn } from '@/lib/utils';

/**
 * Tab strip above the grid. Each tab is its own dashboard (independent widget
 * set + layout). Active tab is solid; others are outlined. The first tab can't
 * be closed; double-click any tab to rename it; "+" adds up to {@link MAX_DASHBOARDS}.
 */
export function DashboardTabs() {
  const { tabs, activeId, hydrated, setActiveId, addTab, closeTab, renameTab } = useDashboardTabs();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

  // Avoid flashing the default tab before localStorage is read.
  if (!hydrated) return null;

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setDraft(name);
  };
  const commitRename = () => {
    if (editingId) renameTab(editingId, draft);
    setEditingId(null);
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      {tabs.map((tab, i) => {
        if (tab.id === editingId) {
          return (
            <input
              key={tab.id}
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              aria-label={`Rename ${tab.name}`}
              className="h-8 w-36 rounded-md border border-primary bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          );
        }
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-md text-sm transition-colors',
              active
                ? 'bg-primary font-medium text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              i > 0 ? 'pl-3 pr-1.5' : 'px-3',
            )}
          >
            <button
              type="button"
              onClick={() => setActiveId(tab.id)}
              onDoubleClick={() => startRename(tab.id, tab.name)}
              className="max-w-[12rem] truncate focus-visible:outline-none"
              title={`${tab.name} — double-click to rename`}
            >
              {tab.name}
            </button>
            {i > 0 && (
              <button
                type="button"
                onClick={() => closeTab(tab.id)}
                aria-label={`Close ${tab.name}`}
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-sm transition-colors',
                  active
                    ? 'hover:bg-primary-foreground/20'
                    : 'hover:bg-destructive/15 hover:text-destructive',
                )}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
      {tabs.length < MAX_DASHBOARDS && (
        <button
          type="button"
          onClick={addTab}
          aria-label="Add dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
