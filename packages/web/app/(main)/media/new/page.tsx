'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MEDIA_TYPES, type MediaType } from '@midnite/shared';
import { getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { MediaDetailView } from '../[id]/media-detail-view';

function NewMedia() {
  const rawType = useSearchParams().get('type');
  const type: MediaType = MEDIA_TYPES.includes(rawType as MediaType)
    ? (rawType as MediaType)
    : 'image';
  const { data: projects } = useApiData(() => getProjects());
  return <MediaDetailView mode="create" initialType={type} projects={projects ?? []} />;
}

export default function NewMediaPage() {
  return (
    <Suspense fallback={null}>
      <NewMedia />
    </Suspense>
  );
}
