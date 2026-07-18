'use client';

import { PageHeader } from '@/components/page-header';
import { getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { SlidesView } from './slides-view';

export default function SlidesPage() {
  const { data: projects } = useApiData(() => getProjects());

  return (
    <>
      <PageHeader
        title="Slides"
        icon="Presentation"
        description="Paste Markdown to build a deck, then present it with typewriter reveals — stored in this browser."
      />
      <div className="container space-y-6 pb-8 pt-2">
        <SlidesView projects={projects ?? []} />
      </div>
    </>
  );
}
