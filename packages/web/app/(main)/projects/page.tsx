'use client';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getMemories, getProjects, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { ProjectsView } from './projects-view';

export default function ProjectsPage() {
  const { data, error } = useApiData(() => Promise.all([getProjects(), getTasks(), getMemories()]));
  const projects = data?.[0] ?? [];
  const tasks = data?.[1] ?? [];
  const memories = data?.[2] ?? [];

  return (
    <>
      <PageHeader
        title="Projects"
        icon="Folder"
        description="Group related work, attach sources, and draft a plan that becomes tasks."
        actions={<SearchBar placeholder="Search projects" />}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <ProjectsView initial={projects} tasks={tasks} memories={memories} />
      </div>
    </>
  );
}
