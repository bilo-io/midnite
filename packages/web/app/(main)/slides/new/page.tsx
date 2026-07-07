'use client';

import { PageHeader } from '@/components/page-header';
import { DeckEditor } from '@/components/slides/deck-editor';

export default function NewDeckPage() {
  return (
    <>
      <PageHeader
        title="New deck"
        icon="Presentation"
        description="Paste Markdown — the first # is a cover, every ## starts a slide, and each point becomes a reveal."
      />
      <div className="container space-y-6 pb-8 pt-2">
        <DeckEditor />
      </div>
    </>
  );
}
