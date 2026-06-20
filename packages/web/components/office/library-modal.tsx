'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BOOKS, bookCategories, bookSearchUrl, filterBooks } from '@/lib/office/books';

/**
 * The library: a searchable shelf of "books". Opened from the Phaser scene when
 * the player walks up to the bookshelf (Phase 9 C). Search by title/author + a
 * category filter narrow the list; clicking a book opens a Google search in a new
 * tab (a real reader is a later upgrade). Escape/close returns to the room
 * (Phaser's keyboard is disabled while open, mirroring the board panel).
 */
export function LibraryModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => bookCategories(), []);
  const results = useMemo(() => filterBooks(BOOKS, query, category), [query, category]);

  // Own Escape so it closes the panel (Phaser's keyboard is disabled while open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Library"
        className="animate-dialog-in relative flex max-h-[88%] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h2 className="flex-1 text-sm font-semibold">Library</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-2.5 border-b border-border/60 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or author…"
              aria-label="Search books"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip label="All" active={category === 'all'} onClick={() => setCategory('all')} />
            {categories.map((c) => (
              <CategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No books match your search.</p>
          ) : (
            <ul className="space-y-1.5">
              {results.map((book) => (
                <li key={book.id}>
                  <a
                    href={bookSearchUrl(book)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2 transition-colors hover:border-border hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{book.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {book.author} · {book.category}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/80">{book.blurb}</p>
                    </div>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border/60 bg-background/40 text-muted-foreground hover:border-border hover:bg-muted/50',
      )}
    >
      {label}
    </button>
  );
}
