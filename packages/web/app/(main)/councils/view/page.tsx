'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCouncil, listCouncilRuns } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { ResourceNotFound } from '@/components/resource-not-found';
import { CouncilDetailView } from '../[id]/council-detail-view';

// Static-export-friendly replacement for /councils/[id]: id from ?id=.
function Detail() {
  const id = useSearchParams().get('id') ?? '';
  const { data, loading, error } = useApiData(
    async () => {
      const council = await getCouncil(id);
      const runs = await listCouncilRuns(id).catch(() => []);
      return { council, runs };
    },
    [id],
  );

  if (!id || error || (!loading && !data?.council)) {
    return <ResourceNotFound feature="councils" singular="council" />;
  }
  if (!data?.council) return null;
  return <CouncilDetailView initial={data.council} initialRuns={data.runs} />;
}

export default function CouncilViewPage() {
  return (
    <Suspense fallback={null}>
      <Detail />
    </Suspense>
  );
}
