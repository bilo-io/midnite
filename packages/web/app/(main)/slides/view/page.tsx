'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDeck } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { DeckEditor } from '@/components/slides/deck-editor';

// Static-export-friendly editor route: the deck id comes from ?id= (no [id] segment).
function DeckLoader() {
  const id = useSearchParams().get('id') ?? '';
  const { data, loading, error } = useApiData((signal) => getDeck(id, signal), [id]);

  if (!id || error || (!loading && !data)) {
    return <div className="container py-12 text-sm text-muted-foreground">Deck not found.</div>;
  }
  if (!data) return null;
  return <DeckEditor key={data.id} initial={data} />;
}

export default function DeckViewPage() {
  return (
    <Suspense fallback={null}>
      <DeckLoader />
    </Suspense>
  );
}
