'use client';

import Link from 'next/link';
import { Layers, Trash2 } from 'lucide-react';
import type { DeckSummary } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { FormatBadge } from '@/components/slides/format-badge';
import { relativeTime } from '@/lib/utils';

type Props = {
  deck: DeckSummary;
  onDelete: (deck: DeckSummary) => void;
};

export function DeckCard({ deck, onDelete }: Props) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FormatBadge format={deck.format} />
          <Link
            href={`/slides/view?id=${deck.id}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {deck.name}
          </Link>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${deck.name}`}
          onClick={() => onDelete(deck)}
          className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {deck.description ? (
        <Link href={`/slides/view?id=${deck.id}`} className="block">
          <p className="line-clamp-2 text-xs text-muted-foreground">{deck.description}</p>
        </Link>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" />
          {deck.slideCount} slide{deck.slideCount === 1 ? '' : 's'}
        </span>
        <span className="tabular-nums">{relativeTime(deck.updatedAt)}</span>
      </div>
    </div>
  );
}
