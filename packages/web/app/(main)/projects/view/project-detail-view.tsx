'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { Memory, Project, TaskSummary } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { ConnectionStatus } from '@/components/connection-status';
import { Tabs, type TabOption } from '@midnite/ui';
import { ProjectDetailsPanel } from '@/components/projects/panels/project-details-panel';
import { ProjectPlanPanel } from '@/components/projects/panels/project-plan-panel';
import { ProjectTasksPanel } from '@/components/projects/panels/project-tasks-panel';
import { ProjectPhaseDocsPanel } from '@/components/projects/panels/project-phasedocs-panel';
import { ProjectStatsPanel } from '@/components/projects/project-stats-panel';
import { ProjectInfoPanel } from '@/components/projects/project-info-panel';
import { getMemories, getProject, getTasks } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { taskPageHref } from '@/lib/task-route';
import { useApiData } from '@/lib/use-api-data';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

type Tab = 'details' | 'plan' | 'tasks' | 'phasedocs';
const TAB_OPTIONS: TabOption<Tab>[] = [
  { value: 'details', label: 'Details' },
  { value: 'plan', label: 'Plan' },
  { value: 'tasks', label: 'Tasks' },
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

  const back = (
    <Link
      href="/projects"
      className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      All projects
    </Link>
  );

  if (!id || error || (!loading && !data)) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
          Project not found.
        </div>
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
        actions={
          <div className="flex items-center gap-2">
            <ConnectionStatus variant="compact" />
            {isMobile ? (
              <>
                <RailToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
                <RailToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
              </>
            ) : null}
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Projects
            </Link>
          </div>
        }
      />

      <div className="reveal-staged container space-y-5 pb-8 pt-2">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Left rail — stats + quick actions. */}
          <Rail side="left" open={leftOpen} isMobile={isMobile} onToggle={() => setLeftOpen(!leftOpen)} title="Stats & actions">
            <ProjectStatsPanel
              project={project}
              tasks={tasks}
              onSaved={reload}
              onDeleted={() => router.push('/projects')}
            />
          </Rail>

          {/* Center — the aspect tabs (same panels as the modal). */}
          <div className="min-w-0 flex-1 space-y-4">
            <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} ariaLabel="Project sections" />
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              {tab === 'details' ? (
                <ProjectDetailsPanel project={project} memories={memories} onSaved={reload} />
              ) : tab === 'plan' ? (
                <ProjectPlanPanel project={project} />
              ) : tab === 'tasks' ? (
                <ProjectTasksPanel tasks={tasks} onSelectTask={openTask} />
              ) : (
                <ProjectPhaseDocsPanel projectId={project.id} />
              )}
            </div>
          </div>

          {/* Right rail — sources + activity. */}
          <Rail side="right" open={rightOpen} isMobile={isMobile} onToggle={() => setRightOpen(!rightOpen)} title="Sources & activity">
            <ProjectInfoPanel project={project} tasks={tasks} onChange={reload} onSelectTask={openTask} />
          </Rail>
        </div>
      </div>
    </>
  );
}

function Rail({
  side,
  open,
  isMobile,
  onToggle,
  title,
  children,
}: {
  side: 'left' | 'right';
  open: boolean;
  isMobile: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (isMobile && !open) return null;

  if (!open) {
    return (
      <div className="hidden w-10 shrink-0 lg:block">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Expand ${title}`}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:text-foreground"
        >
          {side === 'left' ? <PanelLeftOpen className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'w-full shrink-0 rounded-lg border border-border/60 bg-card/40 p-4 lg:w-72',
        side === 'left' ? 'lg:order-first' : 'lg:order-last',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Collapse ${title}`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          {side === 'left' ? <PanelLeftClose className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </button>
      </div>
      {children}
    </aside>
  );
}

function RailToggle({ side, open, onClick }: { side: 'left' | 'right'; open: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? (open ? PanelLeftClose : PanelLeftOpen) : open ? PanelRightClose : PanelRightOpen;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Toggle ${side} panel`}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
