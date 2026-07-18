'use client';

import { getProjects, listMedia } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { PageHeader } from '@/components/page-header';
import { MediaView } from './media-view';

export default function MediaPage() {
  const { data, error } = useApiData(() => Promise.all([listMedia(), getProjects()]));
  const items = data?.[0] ?? [];
  const projects = data?.[1] ?? [];

  return (
    <>
      <PageHeader title="Media" icon="Images" />
      <MediaView items={items} projects={projects} error={error} />
    </>
  );
}
