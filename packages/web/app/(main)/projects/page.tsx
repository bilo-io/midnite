import type { Project, Task } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getProjects, getTasks } from '@/lib/api';
import { ProjectsView } from './projects-view';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let tasks: Task[] = [];
  let error: string | null = null;
  try {
    [projects, tasks] = await Promise.all([getProjects(), getTasks()]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load projects';
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Group related work, attach sources, and draft a plan that becomes tasks."
        actions={<SearchBar placeholder="Search projects" />}
      />
      <div className="container space-y-6 pb-8 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <ProjectsView initial={projects} tasks={tasks} />
      </div>
    </>
  );
}
