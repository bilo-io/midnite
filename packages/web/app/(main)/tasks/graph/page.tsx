'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/page-header';
import { TaskGraphView } from '@/components/task-graph/task-graph-view';
import { getProjects, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

// Phase 58 B — the dependency DAG. Static-export-friendly (output: 'export'):
// scope (`?projectId=`) + the open task (`?task=`) live in the query string and
// are read client-side, like the other cockpits. useSearchParams (inside the
// view) needs a Suspense boundary.
function TaskGraphContainer() {
  const t = useTranslations('board');
  const { data } = useApiData(() => Promise.all([getTasks(), getProjects()]));
  const tasks = data?.[0] ?? [];
  const projects = data?.[1] ?? [];

  return (
    <div className="flex h-[calc(100dvh_-_var(--titlebar-h,0px))] flex-col overflow-hidden">
      <PageHeader
        title={t('graph.pageTitle')}
        icon="Workflow"
        description={t('graph.pageDescription')}
      />
      <div className="min-h-0 flex-1">
        <TaskGraphView tasks={tasks} projects={projects} />
      </div>
    </div>
  );
}

export default function TaskGraphPage() {
  return (
    <Suspense fallback={null}>
      <TaskGraphContainer />
    </Suspense>
  );
}
