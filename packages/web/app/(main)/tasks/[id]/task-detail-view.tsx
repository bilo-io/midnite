'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TaskDetail } from '@/components/task-detail';
import { getProjects, getTask, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

/**
 * Full-page task detail (Phase 42 Theme A). A shareable, refresh-safe URL for a
 * single task that reuses the same `<TaskDetail>` body as the modal. The id rides
 * the `?id=` query string — `output: 'export'` can't prerender arbitrary runtime
 * ids, so this mirrors the `/ideas/view`, `/councils/view`, `/media/view` pattern.
 *
 * Fetches the task plus the full `projects` + sibling `tasks` lists in parallel so
 * the dependency/blocker UI matches the modal exactly (Decision §6).
 */
export function TaskDetailView() {
  const router = useRouter();
  const id = useSearchParams().get('id') ?? '';
  const { data, loading, error } = useApiData(
    () => (id ? Promise.all([getTask(id), getProjects(), getTasks()]) : Promise.resolve(null)),
    [id],
  );
  const task = data?.[0] ?? null;
  const projects = data?.[1] ?? [];
  const tasks = data?.[2] ?? [];

  // Reflect the task in the document title for shareable/bookmarked tabs.
  useEffect(() => {
    if (!task) return;
    const previous = document.title;
    document.title = `${task.title} · midnite`;
    return () => {
      document.title = previous;
    };
  }, [task]);

  const back = (
    <button
      type="button"
      onClick={() => router.push('/tasks')}
      className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      All tasks
    </button>
  );

  if (!id || error || (!loading && !task)) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
          {error ? 'Could not load this task.' : 'Task not found.'}
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6 pb-12">
      {back}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <TaskDetail
          task={task}
          projects={projects}
          tasks={tasks}
          onClose={() => router.push('/tasks')}
          variant="page"
        />
      </div>
    </div>
  );
}
