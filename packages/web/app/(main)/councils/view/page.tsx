'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCouncil, getProjects, listCouncilRuns } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { ResourceNotFound } from '@/components/resource-not-found';
import { CouncilDetailView } from '../[id]/council-detail-view';

// Static-export-friendly replacement for /councils/[id]: id from ?id=.
function Detail() {
  const id = useSearchParams().get('id') ?? '';
  const { data, loading, error } = useApiData(
    async () => {
      const council = await getCouncil(id);
      const [runs, projects] = await Promise.all([
        listCouncilRuns(id).catch(() => []),
        getProjects().catch(() => []),
      ]);
      return { council, runs, projects };
    },
    [id],
  );

  if (!id || error || (!loading && !data?.council)) {
    return <ResourceNotFound feature="councils" singular="council" />;
  }
  if (!data?.council) return null;
  return (
    <CouncilDetailView initial={data.council} initialRuns={data.runs} projects={data.projects} />
  );
}

export default function CouncilViewPage() {
  return (
    <Suspense fallback={null}>
      <Detail />
    </Suspense>
  );
}
