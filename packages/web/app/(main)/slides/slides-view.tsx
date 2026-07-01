'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, ListTree, Plus, Presentation, type LucideIcon } from 'lucide-react';
import type { DeckSummary } from '@midnite/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';
import { DeckCard } from '@/components/slides/deck-card';
import { DeckTable } from '@/components/slides/deck-table';
import { deleteDeck } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { cn } from '@/lib/utils';

type View = 'grid' | 'table';
const VIEWS: readonly View[] = ['grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.slides.view';
const VIEW_OPTIONS: Array<{ value: View; label: string; Icon: LucideIcon }> = [
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
  { value: 'table', label: 'Table view', Icon: ListTree },
];

type Props = {
  decks: DeckSummary[];
  error?: string | null;
};

export function SlidesView({ decks, error }: Props) {
  // localStorage-persisted, SSR-safe: default on the server, hydrate on mount.
  const [view, setViewState] = useState<View>('grid');
  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && (VIEWS as readonly string[]).includes(stored)) setViewState(stored as View);
  }, []);
  const setView = useCallback((next: View) => {
    setViewState(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures (private mode, quota) — view is non-critical.
    }
  }, []);

  const confirm = useConfirm();
  const toast = useToast();

  const onDelete = useCallback(
    async (deck: DeckSummary) => {
      const ok = await confirm({
        title: `Delete “${deck.name}”?`,
        description: 'This permanently deletes the deck and all its slides. This cannot be undone.',
        confirmLabel: 'Delete',
      });
      if (!ok) return;
      try {
        await deleteDeck(deck.id);
        invalidateData();
        toast.success('Deck deleted');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete deck');
      }
    },
    [confirm, toast],
  );

  if (error) {
    return (
      <div className="container py-12 text-sm text-destructive">Failed to load decks: {error}</div>
    );
  }

  if (decks.length === 0) {
    return (
      <EmptyState
        Icon={Presentation}
        title="No decks yet"
        description="Create a deck to author and present slides in Markdown or HTML, themed to match your app."
        action={
          <Link href="/slides/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="h-4 w-4" />
            New deck
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          {decks.length} deck{decks.length === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            {VIEW_OPTIONS.map(({ value, label, Icon }) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={label}
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={cn('h-7 w-7', view === value && 'bg-accent text-accent-foreground')}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <Link href="/slides/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="h-4 w-4" />
            New deck
          </Link>
        </div>
      </div>

      {view === 'table' ? (
        <DeckTable decks={decks} onDelete={onDelete} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
