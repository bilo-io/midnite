'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { getMemories, getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { MemoryView } from './memory-view';

export default function MemoryPage() {
  const t = useTranslations('memory');
  const { data, error } = useApiData(() => Promise.all([getMemories(), getProjects()]));
  const memories = data?.[0] ?? [];
  const projects = data?.[1] ?? [];
  useGatewayErrorToast(error);

  return (
    <>
      <PageHeader
        title={t('list.title')}
        icon="BrainCircuit"
        description={t('list.description')}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <MemoryView initial={memories} projects={projects} />
      </div>
    </>
  );
}
