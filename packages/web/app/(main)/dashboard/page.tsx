'use client';

import type { TaskCounts } from '@midnite/shared';
import dynamic from 'next/dynamic';

const DashboardGrid = dynamic(
  () => import('@/components/dashboard-grid').then((m) => m.DashboardGrid),
  { ssr: false },
);
import { PageHeader } from '@/components/page-header';
import { PromptComposer } from '@/components/prompt-composer';
import { getNotes, getProjects, getRoutineProgress, getRoutines, getTaskCounts, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

const ZERO_COUNTS: TaskCounts = { backlog: 0, todo: 0, inProgress: 0, done: 0 };

export default function DashboardPage() {
  const { data, error } = useApiData(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [counts, projects, tasks, notes, routines] = await Promise.all([
      getTaskCounts(),
      getProjects(),
      getTasks(),
      getNotes(),
      getRoutines(),
    ]);
    const todayProgress =
      routines.length > 0
        ? (await Promise.all(routines.map((r) => getRoutineProgress(r.id, today, today)))).flat()
        : [];
    return { counts, projects, tasks, notes, routines, todayProgress };
  });

  const counts = data?.counts ?? ZERO_COUNTS;
  const projects = data?.projects ?? [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        icon="LayoutDashboard"
        size="lg"
        description="An overview of your task backlog. Draft a feature list below — one task per line — then craft it into the Backlog or Todo when you're ready."
      />

      <div data-tour="dashboard">
        <DashboardGrid
          counts={counts}
          projects={projects}
          tasks={data?.tasks ?? []}
          notes={data?.notes ?? []}
          routines={data?.routines ?? []}
          todayProgress={data?.todayProgress ?? []}
          error={error}
        />
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 transition-[padding] duration-200 md:[padding-left:var(--nav-offset)]">
        <div className="bg-background/0 pb-6 pt-2">
          <div className="container">
            <div className="pointer-events-auto mx-auto w-full max-w-3xl" data-tour="dashboard-composer">
              <PromptComposer projects={projects} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
