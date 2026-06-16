import type { Project, Task } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { TasksView } from '@/components/tasks-view';
import { getProjects, getTasks } from '@/lib/api';

// Filters and the active view live in the URL query string and are read
// client-side via useSearchParams, so the route must render dynamically.
export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  let tasks: Task[] = [];
  let projects: Project[] = [];
  let error: string | null = null;
  try {
    [tasks, projects] = await Promise.all([getTasks(), getProjects()]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load tasks';
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <PageHeader
        title="Tasks"
        icon="ListChecks"
        description="Tasks grouped by status. Switch between board and table, and filter by status or project."
        actions={<SearchBar placeholder="Search tasks" />}
      />
      <TasksView tasks={tasks} error={error} projects={projects} />
    </div>
  );
}
