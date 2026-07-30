'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { DeckEditor } from '@/components/slides/deck-editor';
import { getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

export default function NewDeckPage() {
  const t = useTranslations('slides');
  const { data: projects } = useApiData(() => getProjects());

  return (
    <>
      <PageHeader title={t('new.title')} icon="Presentation" description={t('new.description')} />
      <div className="container space-y-6 pb-8 pt-2">
        <DeckEditor projects={projects ?? []} />
      </div>
    </>
  );
}
