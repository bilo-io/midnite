'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { SlidesView } from './slides-view';

export default function SlidesPage() {
  const t = useTranslations('slides');
  const { data: projects } = useApiData(() => getProjects());

  return (
    <>
      <PageHeader title={t('list.title')} icon="Presentation" description={t('list.description')} />
      <div className="container space-y-6 pb-8 pt-2">
        <SlidesView projects={projects ?? []} />
      </div>
    </>
  );
}
