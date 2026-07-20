'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Memory, Project, TaskSummary } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { BackLink } from '@/components/back-link';
import { ConnectionStatus } from '@/components/connection-status';
import { RailShell, RailHeaderToggle, Tabs, type TabOption } from '@midnite/ui';
import { ProjectDetailsPanel } from '@/components/projects/panels/project-details-panel';
import { ProjectPlanPanel } from '@/components/projects/panels/project-plan-panel';
import { ProjectTasksPanel } from '@/components/projects/panels/project-tasks-panel';
import { ProjectPhaseDocsPanel } from '@/components/projects/panels/project-phasedocs-panel';
import { ProjectRoadmapPanel } from '@/components/projects/panels/project-roadmap-panel';
import { ProjectStatsPanel } from '@/components/projects/project-stats-panel';
import { ProjectInfoPanel } from '@/components/projects/project-info-panel';
import { ResourceNotFound } from '@/components/resource-not-found';
import { getMemories, getProject, getTasks } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { taskPageHref } from '@/lib/task-route';
import { useApiData } from '@/lib/use-api-data';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsMobile } from '@/hooks/use-media-query';

type Tab = 'details' | 'plan' | 'tasks' | 'roadmap' | 'phasedocs';
const TAB_OPTIONS: TabOption<Tab>[] = [
  { value: 'details', label: 'Details' },
  { value: 'plan', label: 'Plan' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'phasedocs', label: 'Phase docs' },
];
const TAB_VALUES = new Set<string>(TAB_OPTIONS.map((t) => t.value));

/**
 * Container (Phase 55 A): reads `?id=`, fetches the project + its tasks, and
 * renders the cockpit — with inline loading / not-found states so a bookmarked
 * deep link resolves standalone (Decision: inline not-found + back link).
 */
export function ProjectDetailContainer() {
  const id = useSearchParams().get('id') ?? '';
  const { data, loading, error, refresh } = useApiData(async () => {
    if (!id) return null;
    const [project, tasks, memories] = await Promise.all([getProject(id), getTasks(), getMemories().catch(() => [])]);
    return { project, tasks: tasks.filter((t) => t.projectId === id), memories };
  }, [id]);

  useEffect(() => {
    if (!data?.project) return;
    const previous = document.title;
    document.title = `${data.project.name} · midnite`;
    return () => {
      document.title = previous;
    };
  }, [data?.project]);

  const back = <BackLink href="/projects" label="All projects" className="mb-4" />;

  if (!id || error || (!loading && !data)) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <ResourceNotFound feature="projects" singular="project" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return <ProjectDetailView project={data.project} tasks={data.tasks} memories={data.memories} onChanged={refresh} />;
}

/**
 * The project cockpit (Phase 55 A/C): a center tab region (Details/Plan/Tasks/
 * Phase-Docs, driven by `?tab=`) flanked by two independently collapsible,
 * state-persisted rails — stats + actions (left), sources + activity (right).
 * On mobile the rails become header-toggled drawers and the center goes
 * full-width. The center panels are the same ones the modal renders.
 */
export function ProjectDetailView({
  project,
  tasks,
  memories = [],
  onChanged,
}: {
  project: Project;
  tasks: TaskSummary[];
  memories?: Memory[];
  onChanged: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [leftOpen, setLeftOpen] = useLocalStorage<boolean>('midnite.project.leftOpen', true);
  const [rightOpen, setRightOpen] = useLocalStorage<boolean>('midnite.project.rightOpen', true);

  const tabParam = searchParams.get('tab');
  const tab: Tab = tabParam && TAB_VALUES.has(tabParam) ? (tabParam as Tab) : 'details';
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/projects/view?${params.toString()}`);
  };

  const openTask = (task: TaskSummary) => router.push(taskPageHref(task.id));
  // Source edits + archive/save re-fetch the whole page (project + tasks + list).
  const reload = () => {
    onChanged();
    invalidateData();
  };

  return (
    <>
      <PageHeader
        title={project.name}
        icon="Folder"
        description={project.tag ? `#${project.tag}` : undefined}
        back={{ href: '/projects', label: 'All projects' }}
        actions={
          <div className="flex items-center gap-2">
            <ConnectionStatus variant="compact" />
            {isMobile ? (
              <>
                <RailHeaderToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
                <RailHeaderToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
              </>
            ) : null}
          </div>
        }
      />

      <div className="reveal-staged container space-y-5 pb-8 pt-2" data-tour="project-detail">
        <RailShell
          isMobile={isMobile}
          left={{
            title: 'Stats & actions',
            open: leftOpen,
            onToggle: () => setLeftOpen(!leftOpen),
            content: (
              <ProjectStatsPanel
                project={project}
                tasks={tasks}
                onSaved={reload}
                onDeleted={() => router.push('/projects')}
              />
            ),
          }}
          right={{
            title: 'Knowledge & activity',
            open: rightOpen,
            onToggle: () => setRightOpen(!rightOpen),
            content: <ProjectInfoPanel project={project} tasks={tasks} onSelectTask={openTask} />,
          }}
        >
          {/* Center — the aspect tabs (same panels as the modal). */}
          <div className="space-y-4">
            <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} ariaLabel="Project sections" />
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              {tab === 'details' ? (
                <ProjectDetailsPanel project={project} memories={memories} onSaved={reload} />
              ) : tab === 'plan' ? (
                <ProjectPlanPanel project={project} />
              ) : tab === 'tasks' ? (
                <ProjectTasksPanel tasks={tasks} onSelectTask={openTask} />
              ) : tab === 'roadmap' ? (
                <ProjectRoadmapPanel project={project} onSelectTask={openTask} />
              ) : (
                <ProjectPhaseDocsPanel projectId={project.id} />
              )}
            </div>
          </div>
        </RailShell>
      </div>
    </>
  );
}

