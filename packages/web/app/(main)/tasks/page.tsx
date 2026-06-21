'use client';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { TasksView } from '@/components/tasks-view';
import { getProjects, getRepos, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

// Client-fetched so the app can be statically exported (output: 'export').
// Filters and the active view live in the URL query string (read client-side).
export default function TasksPage() {
  const { data, error } = useApiData(() => Promise.all([getTasks(), getProjects(), getRepos()]));
  const tasks = data?.[0] ?? [];
  const projects = data?.[1] ?? [];
  const repos = data?.[2] ?? [];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <PageHeader
        title="Tasks"
        icon="ListChecks"
        description="Tasks grouped by status. Switch between board and table, and filter by status or project."
        actions={<SearchBar placeholder="Search tasks" />}
      />
      <TasksView tasks={tasks} error={error} projects={projects} repos={repos} />
    </div>
  );
}
