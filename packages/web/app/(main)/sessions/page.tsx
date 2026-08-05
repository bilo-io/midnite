'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { getProjects, getSessions, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { SessionsView } from './sessions-view';

export default function SessionsPage() {
  const t = useTranslations('sessions');
  const { data, error } = useApiData(() => Promise.all([getSessions(), getTasks(), getProjects()]));
  const sessions = data?.[0] ?? [];
  const tasks = data?.[1] ?? [];
  const projects = data?.[2] ?? [];
  useGatewayErrorToast(error);

  return (
    <>
      <PageHeader
        title={t('page.title')}
        icon="BotMessageSquare"
        description={t('page.description')}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <SessionsView initial={sessions} tasks={tasks} projects={projects} />
      </div>
    </>
  );
}
