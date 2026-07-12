'use client';

import { PageHeader } from '@/components/page-header';
import { DeckEditor } from '@/components/slides/deck-editor';
import { getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

export default function NewDeckPage() {
  const { data: projects } = useApiData(() => getProjects());

  return (
    <>
      <PageHeader
        title="New deck"
        icon="Presentation"
        description="Paste Markdown — the first # is a cover, every ## starts a slide, and each point becomes a reveal."
      />
      <div className="container space-y-6 pb-8 pt-2">
        <DeckEditor projects={projects ?? []} />
      </div>
    </>
  );
}
