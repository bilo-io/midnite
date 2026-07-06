'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getDeckBySlug, type DeckDetail } from '@/lib/slides/store';
import { Deck } from '@/components/slides/deck';

function Present() {
  const params = useSearchParams();
  const slug = params.get('slug') ?? '';
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

  useEffect(() => {
    if (deck) document.title = `${deck.title} · Slides`;
  }, [deck]);

  if (state === 'loading') return <div className="fixed inset-0 z-50 bg-background" />;

  if (state === 'missing' || !deck) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background p-6 text-center text-sm text-muted-foreground">
        <div>
          <p>Deck not found in this browser.</p>
          <Link href="/slides" className="mt-2 inline-block underline">
            Back to decks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <Deck slides={deck.slides} />
    </div>
  );
}

export default function PresentPage() {
  return (
    <Suspense fallback={null}>
      <Present />
    </Suspense>
  );
}
