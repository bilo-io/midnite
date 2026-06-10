import type { Project, SessionSummary, Task } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getProjects, getSessions, getTasks } from '@/lib/api';
import { SessionsView } from './sessions-view';

export const dynamic = 'force-dynamic';

export default async function SessionsPage() {
  let sessions: SessionSummary[] = [];
  let tasks: Task[] = [];
  let projects: Project[] = [];
  let error: string | null = null;
  try {
    [sessions, tasks, projects] = await Promise.all([getSessions(), getTasks(), getProjects()]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load sessions';
  }

  return (
    <>
      <PageHeader
        title="Sessions"
        description="One session per task — its status follows the task (in progress, awaiting input, completed, or idle)."
        actions={<SearchBar placeholder="Search sessions" />}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <SessionsView initial={sessions} tasks={tasks} projects={projects} />
      </div>
    </>
  );
}
