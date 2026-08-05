'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { TasksView, type TaskView } from '@/components/tasks-view';
import { getProjects, getRepos, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

// Client-fetched so the app can be statically exported (output: 'export').
// Filters and the active view live in the URL query string (read client-side).
export default function TasksPage() {
  const t = useTranslations('board');
  const { data, error } = useApiData(() => Promise.all([getTasks(), getProjects(), getRepos()]));
  const tasks = data?.[0] ?? [];
  const projects = data?.[1] ?? [];
  const repos = data?.[2] ?? [];
  const [view, setView] = useState<TaskView>('board');

  // List/board/table all flow with the document: one page scroll region, so the
  // sticky toolbar pins and the collapsing header tucks like on the other list
  // pages. The board columns grow with their content (rather than each scrolling
  // internally) so a full board reads as a tall page — you scroll the whole page
  // to see how full it is. Min-height subtracts the desktop title bar
  // (--titlebar-h); the layout already pads by it, so 100dvh alone overflows 48px.
  //
  // The graph view is the exception — ReactFlow's canvas needs a real, bounded
  // height (like the standalone `/tasks/graph` route gives it) rather than
  // growing with content, and owns its own pan/zoom instead of page scroll.
  return (
    <div
      className={
        view === 'graph'
          ? 'flex h-[calc(100dvh_-_var(--titlebar-h,0px))] flex-col'
          : 'flex min-h-[calc(100dvh_-_var(--titlebar-h,0px))] flex-col'
      }
    >
      <PageHeader
        title={t('page.title')}
        icon="ListChecks"
        description={t('page.description')}
        // The graph view is overflow-hidden (no page scroll), so `useScrolled`
        // can never fire on its own — force the tucked header so the sticky
        // toolbar still sits flush under it/the title bar, not below a full
        // expanded header eating into the canvas's fixed viewport height.
        forceCollapsed={view === 'graph'}
      />
      <TasksView
        tasks={tasks}
        error={error}
        projects={projects}
        repos={repos}
        onViewChange={setView}
      />
    </div>
  );
}
