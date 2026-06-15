import type { Note, Project, Routine, RoutineProgress, Task, TaskCounts } from '@midnite/shared';
import { DashboardGrid } from '@/components/dashboard-grid';
import { PageHeader } from '@/components/page-header';
import { PromptComposer } from '@/components/prompt-composer';
import { getNotes, getProjects, getRoutineProgress, getRoutines, getTaskCounts, getTasks } from '@/lib/api';

const ZERO_COUNTS: TaskCounts = { backlog: 0, todo: 0, inProgress: 0, done: 0 };

export default async function DashboardPage() {
  let counts: TaskCounts = ZERO_COUNTS;
  let projects: Project[] = [];
  let tasks: Task[] = [];
  let notes: Note[] = [];
  let routines: Routine[] = [];
  let todayProgress: RoutineProgress[] = [];
  let error: string | null = null;

  const today = new Date().toISOString().slice(0, 10);

  try {
    [counts, projects, tasks, notes, routines] = await Promise.all([
      getTaskCounts(),
      getProjects(),
      getTasks(),
      getNotes(),
      getRoutines(),
    ]);
    if (routines.length > 0) {
      todayProgress = (
        await Promise.all(routines.map((r) => getRoutineProgress(r.id, today, today)))
      ).flat();
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load dashboard';
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        icon="LayoutDashboard"
        size="lg"
        showGrid
        description="An overview of your task backlog. Draft a feature list below — one task per line — then craft it into the Backlog or Todo when you're ready."
      />

      <DashboardGrid
        counts={counts}
        projects={projects}
        tasks={tasks}
        notes={notes}
        routines={routines}
        todayProgress={todayProgress}
        error={error}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="bg-background/0 pb-6 pt-2">
          <div className="container">
            <div className="pointer-events-auto mx-auto w-full max-w-3xl">
              <PromptComposer projects={projects} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
