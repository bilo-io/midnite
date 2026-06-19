'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBrainstorm, listBrainstormRuns } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { BrainstormDetailView } from '../[id]/brainstorm-detail-view';

// Static-export-friendly replacement for /brainstorms/[id]: id from ?id=.
function Detail() {
  const id = useSearchParams().get('id') ?? '';
  const { data, loading, error } = useApiData(
    async () => {
      const brainstorm = await getBrainstorm(id);
      const runs = await listBrainstormRuns(id).catch(() => []);
      return { brainstorm, runs };
    },
    [id],
  );

  if (!id || error || (!loading && !data?.brainstorm)) {
    return (
      <div className="container py-12 text-sm text-muted-foreground">Brainstorm not found.</div>
    );
  }
  if (!data?.brainstorm) return null;
  return <BrainstormDetailView initial={data.brainstorm} initialRuns={data.runs} />;
}

export default function BrainstormViewPage() {
  return (
    <Suspense fallback={null}>
      <Detail />
    </Suspense>
  );
}
