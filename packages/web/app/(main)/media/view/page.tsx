'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getMedia, getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { ResourceNotFound } from '@/components/resource-not-found';
import { MediaDetailView } from '../[id]/media-detail-view';

// Static-export-friendly replacement for /media/[id]: id from ?id=.
function Detail() {
  const id = useSearchParams().get('id') ?? '';
  const { data, loading, error } = useApiData(
    () => Promise.all([getMedia(id), getProjects()]),
    [id],
  );
  const media = data?.[0];
  const projects = data?.[1] ?? [];

  if (!id || error || (!loading && !media)) {
    return <ResourceNotFound feature="media" singular="media item" />;
  }
  if (!media) return null;
  return <MediaDetailView mode="edit" initial={media} projects={projects} />;
}

export default function MediaViewPage() {
  return (
    <Suspense fallback={null}>
      <Detail />
    </Suspense>
  );
}
