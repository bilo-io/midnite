'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Plus } from 'lucide-react';
import type { Council } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { CouncilCard } from '@/components/council-card';
import { CouncilCreateModal } from '@/components/council-create-modal';
import { cn } from '@/lib/utils';

type View = 'list' | 'grid';
const VIEWS: readonly View[] = ['list', 'grid'];
const VIEW_STORAGE_KEY = 'midnite.councils.view';

export function CouncilsView({ initial }: { initial: Council[] }) {
  const [view, setView] = useState<View>('grid');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && (VIEWS as readonly string[]).includes(stored)) setView(stored as View);
  }, []);

  const onSetView = useCallback((next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filtered = q
    ? initial.filter((c) =>
        [c.name, c.description ?? '', ...c.participants.map((p) => p.name)].some((f) =>
          f.toLowerCase().includes(q),
        ),
      )
    : initial;

  return (
    <div className="space-y-4">
      <div className="reveal-controls flex items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          {filtered.length} council{filtered.length === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => onSetView('list')}
              className={cn('h-7 w-7', view === 'list' && 'bg-accent text-accent-foreground')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => onSetView('grid')}
              className={cn('h-7 w-7', view === 'grid' && 'bg-accent text-accent-foreground')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New council
          </Button>
        </div>
      </div>

      <div className="reveal-content">
        {initial.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No councils yet. Create one, add participants with distinct perspectives, and put a
              topic to them.
            </p>
            <Button type="button" size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New council
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
            No councils match “{q}”.
          </div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-2">
            {filtered.map((c) => (
              <CouncilCard key={c.id} council={c} layout="list" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CouncilCard key={c.id} council={c} layout="grid" />
            ))}
          </div>
        )}
      </div>

      {creating ? <CouncilCreateModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
