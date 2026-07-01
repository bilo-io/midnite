'use client';

import { listDecks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { PageHeader } from '@/components/page-header';
import { SlidesView } from './slides-view';

export default function SlidesPage() {
  const { data, error } = useApiData((signal) => listDecks(signal));

  return (
    <>
      <PageHeader
        title="Slides"
        icon="Presentation"
        description="Author and present reveal.js decks — Markdown or HTML, themed to match your app."
      />
      <SlidesView decks={data ?? []} error={error} />
    </>
  );
}
