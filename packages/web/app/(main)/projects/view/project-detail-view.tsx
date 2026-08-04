'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { Memory, Project, TaskSummary } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/ui/button';
import { RailShell, RailFloatingToggle, RailHeaderToggle, Tabs, type TabOption } from '@midnite/ui';
import { NewTaskModal } from '@/components/new-task-modal';
import { ProjectDetailsPanel } from '@/components/projects/panels/project-details-panel';
import { ProjectDocsPanel } from '@/components/projects/panels/project-docs-panel';
import { ProjectTasksPanel } from '@/components/projects/panels/project-tasks-panel';
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

type Tab = 'details' | 'docs' | 'tasks' | 'roadmap';
const TAB_OPTIONS: TabOption<Tab>[] = [
  { value: 'details', label: 'Details' },
  { value: 'docs', label: 'Docs' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'roadmap', label: 'Roadmap' },
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
    document.title = `${data.project.name} · Midnite`;
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
 * The project cockpit (Phase 55 A/C): a center tab region (Details/Docs/Tasks/
 * Roadmap, driven by `?tab=`) flanked by two independently collapsible,
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
  const tBoard = useTranslations('board');
  const tCommon = useTranslations('common');
  const isMobile = useIsMobile();
  const [leftOpen, setLeftOpen] = useLocalStorage<boolean>('midnite.project.leftOpen', true);
  const [rightOpen, setRightOpen] = useLocalStorage<boolean>('midnite.project.rightOpen', true);
  const [showNewTask, setShowNewTask] = useState(false);

  const tabParam = searchParams.get('tab');
  // Back-compat: a bookmarked `?tab=plan` link (the tab's old name) should still
  // land on the Docs panel rather than falling back to Details.
  const tab: Tab =
    tabParam === 'plan' ? 'docs' : tabParam && TAB_VALUES.has(tabParam) ? (tabParam as Tab) : 'details';
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
        actions={
          isMobile ? (
            <div className="flex items-center gap-2">
              <RailHeaderToggle
                side="left"
                open={leftOpen}
                onClick={() => setLeftOpen(!leftOpen)}
                label={tCommon('ui.rail.toggleLeftPanel')}
              />
              <RailHeaderToggle
                side="right"
                open={rightOpen}
                onClick={() => setRightOpen(!rightOpen)}
                label={tCommon('ui.rail.toggleRightPanel')}
              />
            </div>
          ) : undefined
        }
      />

      <div className="reveal-staged container space-y-5 pb-8 pt-2" data-tour="project-detail">
        <RailShell
          isMobile={isMobile}
          stickyRails
          hideFloatingToggles
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
          {/* Center — the aspect tabs (same panels as the modal), framed between
              the rail toggles in one row. Pins under the collapsed header
              (top-12) while the tab body scrolls behind it, matching the
              council cockpit + the sticky rails. */}
          <div className="space-y-4">
            <div className="sticky top-12 z-20 -mx-1 flex items-center gap-2 border-b border-border/60 bg-background/95 px-1 pb-2 pt-1 backdrop-blur">
              {!isMobile ? (
                <RailFloatingToggle
                  inline
                  side="left"
                  open={leftOpen}
                  title="Stats & actions"
                  onToggle={() => setLeftOpen(!leftOpen)}
                  collapseLabel={tCommon('ui.rail.collapse', { title: 'Stats & actions' })}
                  expandLabel={tCommon('ui.rail.expand', { title: 'Stats & actions' })}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} ariaLabel="Project sections" />
              </div>
              {!isMobile ? (
                <RailFloatingToggle
                  inline
                  side="right"
                  open={rightOpen}
                  title="Knowledge & activity"
                  onToggle={() => setRightOpen(!rightOpen)}
                  collapseLabel={tCommon('ui.rail.collapse', { title: 'Knowledge & activity' })}
                  expandLabel={tCommon('ui.rail.expand', { title: 'Knowledge & activity' })}
                />
              ) : null}
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              {tab === 'details' ? (
                <ProjectDetailsPanel project={project} memories={memories} onSaved={reload} />
              ) : tab === 'docs' ? (
                <ProjectDocsPanel project={project} />
              ) : tab === 'tasks' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    <Button type="button" size="sm" onClick={() => setShowNewTask(true)} className="h-8 gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      {tBoard('toolbar.newTask')}
                    </Button>
                  </div>
                  <ProjectTasksPanel tasks={tasks} onSelectTask={openTask} />
                </div>
              ) : (
                <ProjectRoadmapPanel project={project} onSelectTask={openTask} />
              )}
            </div>
          </div>
        </RailShell>
      </div>

      {showNewTask ? (
        <NewTaskModal
          projects={[]}
          repos={[]}
          tasks={tasks}
          defaultProjectId={project.id}
          onCreated={() => {
            setShowNewTask(false);
            reload();
          }}
          onClose={() => setShowNewTask(false)}
        />
      ) : null}
    </>
  );
}
