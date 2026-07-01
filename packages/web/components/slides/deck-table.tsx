'use client';

import Link from 'next/link';
import { Play, Trash2 } from 'lucide-react';
import type { DeckSummary } from '@midnite/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { FormatBadge } from '@/components/slides/format-badge';
import { cn, relativeTime } from '@/lib/utils';

type Props = {
  decks: DeckSummary[];
  onDelete: (deck: DeckSummary) => void;
};

export function DeckTable({ decks, onDelete }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Format</th>
            <th className="px-3 py-2 text-right font-medium">Slides</th>
            <th className="px-3 py-2 text-right font-medium">Updated</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {decks.map((deck) => (
            <tr key={deck.id} className="group border-b border-border/40 last:border-0 hover:bg-accent/40">
              <td className="max-w-[20rem] px-3 py-2">
                <Link href={`/slides/view?id=${deck.id}`} className="font-medium hover:underline">
                  {deck.name}
                </Link>
                {deck.description ? (
                  <p className="truncate text-xs text-muted-foreground">{deck.description}</p>
                ) : null}
              </td>
              <td className="px-3 py-2">
                <FormatBadge format={deck.format} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{deck.slideCount}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {relativeTime(deck.updatedAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-0.5">
                  <Link
                    href={`/slides/present?id=${deck.id}`}
                    aria-label={`Present ${deck.name}`}
                    title="Present"
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'icon' }),
                      'h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100',
                    )}
                  >
                    <Play className="h-4 w-4" />
                  </Link>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
