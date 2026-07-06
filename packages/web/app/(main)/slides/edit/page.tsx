'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { DeckEditor } from '@/components/slides/deck-editor';
import { getDeckBySlug, type DeckDetail } from '@/lib/slides/store';

function EditDeck() {
  const slug = useSearchParams().get('slug') ?? '';
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [deck, setDeck] = useState<DeckDetail | null>(null);

  // Decks live in localStorage — only readable after mount (client-only).
  useEffect(() => {
    const d = slug ? getDeckBySlug(slug) : null;
    if (d) {
      setDeck(d);
      setState('ready');
    } else {
      setState('missing');
    }
  }, [slug]);

  return (
    <>
      <PageHeader
        title="Edit deck"
        icon="Presentation"
        description="Update the Markdown — the deck's link stays the same."
      />
      <div className="container space-y-6 pb-8 pt-2">
        {state === 'loading' ? (
          <div className="h-40" aria-hidden />
        ) : state === 'missing' || !deck ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/20 px-6 py-12 text-center text-sm text-muted-foreground">
            Deck not found in this browser.{' '}
            <Link href="/slides" className="underline">
              Back to decks
            </Link>
          </div>
        ) : (
          <DeckEditor initial={{ slug: deck.slug, markdown: deck.markdown, title: deck.title }} />
        )}
      </div>
    </>
  );
}

export default function EditDeckPage() {
  return (
    <Suspense fallback={null}>
      <EditDeck />
    </Suspense>
  );
}
