'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, Plus, Presentation, Search, type LucideIcon } from 'lucide-react';
import { CountPill } from '@/components/count-pill';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StyledSelect } from '@/components/ui/styled-select';
import { EmptyState } from '@/components/empty-state';
import { DeckCard, DeckRow } from '@/components/slides/deck-card';
import { useDecks } from '@/lib/slides/use-decks';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

type View = 'grid' | 'list';
const VIEW_OPTIONS: Array<{ value: View; label: string; Icon: LucideIcon }> = [
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
  { value: 'list', label: 'List view', Icon: List },
];

type Sort = 'recent' | 'oldest' | 'title' | 'title-desc' | 'updated' | 'count';
const SORT_OPTIONS: ReadonlyArray<{ value: Sort; label: string }> = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'count', label: 'Most slides' },
];

export function SlidesView() {
  const { decks, hydrated, refresh } = useDecks();
  const [view, setView] = useLocalStorage<View>('midnite.slides.view', 'grid');
  const [sort, setSort] = useLocalStorage<Sort>('midnite.slides.sort', 'recent');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = decks.filter(
      (d) => !q || d.title.toLowerCase().includes(q) || String(d.id).includes(q),
    );
    const sorted = [...list];
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => (a.created < b.created ? -1 : a.created > b.created ? 1 : 0));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'updated':
        sorted.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0));
        break;
      case 'count':
        sorted.sort((a, b) => b.count - a.count);
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0));
        break;
    }
    return sorted;
  }, [decks, query, sort]);

  // Avoid flashing the empty state before localStorage has been read.
  if (!hydrated) return <div className="h-40" aria-hidden />;

  if (decks.length === 0) {
    return (
      <EmptyState
        Icon={Presentation}
        title="No decks yet"
        description="Create a deck by pasting Markdown — headings become slides and each point types itself in as you present."
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decks…"
            aria-label="Search decks"
            className="pl-8"
          />
        </div>

        <StyledSelect<Sort>
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
          aria-label="Sort decks"
          className="w-44"
        />

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

      <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
        <CountPill count={decks.length} noun="deck" />
        {query && filtered.length !== decks.length ? <span>· {filtered.length} matching</span> : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/20 px-6 py-12 text-center text-sm text-muted-foreground">
          No decks match “{query}”.
        </div>
      ) : view === 'list' ? (
        <div className="flex flex-col gap-2">
          {filtered.map((deck) => (
            <DeckRow key={deck.slug} deck={deck} onChanged={refresh} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((deck) => (
            <DeckCard key={deck.slug} deck={deck} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
