'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getDeckBySlug, type DeckDetail } from '@/lib/slides/store';
import { Deck } from '@/components/slides/deck';

function Present() {
  const t = useTranslations('slides');
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
    if (deck) document.title = t('present.documentTitle', { title: deck.title });
  }, [deck, t]);

  if (state === 'loading') return <div className="fixed inset-0 z-50 bg-background" />;

  if (state === 'missing' || !deck) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background p-6 text-center text-sm text-muted-foreground">
        <div>
          <p>{t('notFound.message')}</p>
          <Link href="/slides" className="mt-2 inline-block underline">
            {t('notFound.back')}
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
