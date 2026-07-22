'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { TasksView, type TaskView } from '@/components/tasks-view';
import { getProjects, getRepos, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

// Client-fetched so the app can be statically exported (output: 'export').
// Filters and the active view live in the URL query string (read client-side).
export default function TasksPage() {
  const { data, error } = useApiData(() => Promise.all([getTasks(), getProjects(), getRepos()]));
  const tasks = data?.[0] ?? [];
  const projects = data?.[1] ?? [];
  const repos = data?.[2] ?? [];

  // The board is a bounded viewport-height layout (columns scroll internally,
  // horizontal overflow between them); list/table flow with the document so the
  // page has a single scroll region and the sticky toolbar pins like on the
  // other list pages. Height subtracts the desktop title bar (--titlebar-h) —
  // the layout already pads by it, so 100dvh alone overflows by 48px.
  const [view, setView] = useState<TaskView>('board');

  return (
    <div
      className={
        view === 'board'
          ? 'flex h-[calc(100dvh_-_var(--titlebar-h,0px))] flex-col overflow-hidden'
          : 'flex min-h-[calc(100dvh_-_var(--titlebar-h,0px))] flex-col'
      }
    >
      <PageHeader
        title="Tasks"
        icon="ListChecks"
        description="Tasks grouped by status. Switch between board and table, and filter by status or project."
      />
      <TasksView tasks={tasks} error={error} projects={projects} repos={repos} onViewChange={setView} />
    </div>
  );
}
