'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { getMemories, getProjects, getRepos, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { ProjectsView } from './projects-view';

export default function ProjectsPage() {
  const t = useTranslations('projects');
  const { data, error } = useApiData(() =>
    Promise.all([getProjects(), getTasks(), getMemories(), getRepos()]),
  );
  const projects = data?.[0] ?? [];
  const tasks = data?.[1] ?? [];
  const memories = data?.[2] ?? [];
  const repos = data?.[3] ?? [];
  useGatewayErrorToast(error);

  return (
    <>
      <PageHeader
        title={t('page.title')}
        icon="Folder"
        description={t('page.description')}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <ProjectsView initial={projects} tasks={tasks} repos={repos} memories={memories} />
      </div>
    </>
  );
}
