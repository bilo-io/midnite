'use client';

import { PageHeader } from '@/components/page-header';
import { getMemories, getProjects, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { ProjectsView } from './projects-view';

export default function ProjectsPage() {
  const { data, error } = useApiData(() => Promise.all([getProjects(), getTasks(), getMemories()]));
  const projects = data?.[0] ?? [];
  const tasks = data?.[1] ?? [];
  const memories = data?.[2] ?? [];
  useGatewayErrorToast(error);

  return (
    <>
      <PageHeader
        title="Projects"
        icon="Folder"
        description="Group related work, attach sources, and draft a plan that becomes tasks."
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <ProjectsView initial={projects} tasks={tasks} memories={memories} />
      </div>
    </>
  );
}
