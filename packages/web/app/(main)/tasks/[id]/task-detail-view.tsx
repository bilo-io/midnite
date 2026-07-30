'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MAX_TASK_TITLE_LENGTH, type Project, type Status, type Task, type TaskSummary } from '@midnite/shared';
import { RailShell, RailHeaderToggle } from '@midnite/ui';
import { TaskDetail, Timeline, type TaskDetailTab } from '@/components/task-detail';
import { PageHeader } from '@/components/page-header';
import { PrioritySelect } from '@/components/priority-select';
import { StatusSelect } from '@/components/status-select';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { ProjectSelect } from '@/components/project-select';
import { RunTimeline } from '@/components/run-timeline';
import { TaskActionButtons, useTaskActions } from '@/components/task-actions';
import { ResourceNotFound } from '@/components/resource-not-found';
import { BackLink } from '@/components/back-link';
import { useToast } from '@/components/toast';
import {
  getProjects,
  getTask,
  getTasks,
  setTaskPriority,
  updateTaskDetails,
  updateTaskProject,
} from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useKindLabel, useStatusLabel } from '@/lib/i18n-labels';
import { moveTask } from '@/lib/task-transitions';
import { useApiData } from '@/lib/use-api-data';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsMobile } from '@/hooks/use-media-query';

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
  const t = useTranslations('task');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const tabParam = searchParams.get('tab');
  const tab: 'details' | 'review' | 'retro' =
    tabParam === 'review' ? 'review' : tabParam === 'retro' ? 'retro' : 'details';
  // Keep the URL in step with the active tab so a review/retro is bookmarkable/
  // shareable at the tab it was left on (Phase 52 E, Phase 62 F). `replace` avoids
  // stacking history.
  // The page never surfaces the modal-only `session` tab, but the handler accepts
  // the full union to satisfy TaskDetail's contract — anything but review/retro
  // clears the query param.
  const setTab = (next: TaskDetailTab) => {
    const qs = new URLSearchParams(searchParams.toString());
    if (next === 'review' || next === 'retro') qs.set('tab', next);
    else qs.delete('tab');
    router.replace(`/tasks/view?${qs.toString()}`);
  };
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

  const back = <BackLink href="/tasks" label={t('allTasks')} className="mb-4" />;

  if (!id || error || (!loading && !task)) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <ResourceNotFound feature="tasks" singular="task" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
      </div>
    );
  }

  return (
    <TaskDetailPage
      task={task}
      projects={projects}
      tasks={tasks}
      tab={tab}
      onTabChange={setTab}
      onClose={() => router.push('/tasks')}
    />
  );
}

/**
 * The full-page task cockpit (Phase 82) — mirrors the session detail layout: a
 * collapsing `PageHeader`, a sticky action bar (project + lifecycle actions), and
 * a two-rail shell. The left rail holds the agent runs, the right rail the
 * activity timeline, and the center carries the task body + its Details/Review/
 * Retro tabs. The heavy body logic stays in `<TaskDetail>` (embedded, chromeless).
 */
function TaskDetailPage({
  task,
  projects,
  tasks,
  tab,
  onTabChange,
  onClose,
}: {
  task: Task;
  projects: Project[];
  tasks: TaskSummary[];
  tab: TaskDetailTab;
  onTabChange: (tab: TaskDetailTab) => void;
  onClose: () => void;
}) {
  const t = useTranslations('task');
  const kindLabel = useKindLabel();
  const statusLabel = useStatusLabel();
  const router = useRouter();
  const toast = useToast();
  const isMobile = useIsMobile();
  const [leftOpen, setLeftOpen] = useLocalStorage<boolean>('midnite.task.leftOpen', true);
  const [rightOpen, setRightOpen] = useLocalStorage<boolean>('midnite.task.rightOpen', true);

  const tasksById = new Map(tasks.map((t) => [t.id, t] as const));
  const actions = useTaskActions({ task, tasksById, onActionComplete: onClose });
  const { statusError, setStatusError } = actions;
  // No inline error banner up here (like the session cockpit) — surface as a toast.
  useEffect(() => {
    if (!statusError) return;
    toast.error(statusError);
    setStatusError(null);
  }, [statusError, setStatusError, toast]);

  const [projectId, setProjectId] = useState<string | null>(task.projectId ?? null);
  const [projectBusy, setProjectBusy] = useState(false);
  const reassign = async (next: string | null) => {
    const prev = projectId;
    setProjectId(next); // optimistic
    setProjectBusy(true);
    try {
      await updateTaskProject(task.id, next);
      invalidateData();
    } catch (e) {
      setProjectId(prev); // roll back
      toast.error(e instanceof Error ? e.message : t('project.changeFailed'));
    } finally {
      setProjectBusy(false);
    }
  };

  // Inline-editable title/status/priority (Phase 82 follow-up) — mirrors the
  // modal's header fields (`TaskDetail`'s own state), since the page owns its
  // title/description row via `PageHeader` instead of `TaskDetail`'s `<header>`
  // (suppressed here with `hideHeader`).
  const [title, setTitle] = useState(task.title);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [statusSelectBusy, setStatusSelectBusy] = useState(false);

  useEffect(() => {
    if (titleEditing) titleInputRef.current?.select();
  }, [titleEditing]);

  const saveTitle = async (next: string) => {
    const prev = title;
    setTitle(next); // optimistic
    try {
      const updated = await updateTaskDetails(task.id, { title: next });
      setTitle(updated.title);
      invalidateData();
    } catch (e) {
      setTitle(prev);
      setTitleDraft(prev);
      toast.error(e instanceof Error ? e.message : t('title.saveFailed'));
    }
  };

  const commitTitle = () => {
    const next = titleDraft.trim();
    setTitleEditing(false);
    if (next && next !== title) void saveTitle(next);
    else setTitleDraft(title);
  };

  const changePriority = async (next: number) => {
    const prev = priority;
    setPriority(next); // optimistic
    try {
      const updated = await setTaskPriority(task.id, next);
      setPriority(updated.priority);
      invalidateData();
    } catch (e) {
      setPriority(prev);
      toast.error(e instanceof Error ? e.message : t('priority.saveFailed'));
    }
  };

  // `moveTask`, not `updateTaskStatus` — the dropdown offers `wip`, so entering it
  // must spawn an agent session and leaving it must stop one (see StatusSelect).
  const changeStatus = async (next: Status) => {
    const prev = status;
    setStatus(next); // optimistic
    setStatusSelectBusy(true);
    try {
      await moveTask(prev, next, task.id);
      invalidateData();
    } catch (e) {
      setStatus(prev);
      toast.error(e instanceof Error ? e.message : t('status.saveFailed'));
    } finally {
      setStatusSelectBusy(false);
    }
  };

  const goToSession = () => router.push(`/sessions/view?id=${encodeURIComponent(task.id)}`);
  const kind = task.kind ?? 'unknown';
  const displayTask: Task = { ...task, title, priority, status };

  return (
    <>
      <PageHeader
        title={title}
        icon="ListChecks"
        titleNode={
          titleEditing ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') {
                  setTitleDraft(title);
                  setTitleEditing(false);
                }
              }}
              maxLength={MAX_TASK_TITLE_LENGTH}
              aria-label={t('title.editAria')}
              className="w-full min-w-0 rounded bg-transparent font-semibold tracking-tight outline-none ring-1 ring-ring"
            />
          ) : (
            <span
              role="button"
              tabIndex={0}
              onClick={() => {
                setTitleDraft(title);
                setTitleEditing(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTitleDraft(title);
                  setTitleEditing(true);
                }
              }}
              title={t('title.editHint')}
              className="cursor-text truncate rounded px-0.5 hover:bg-accent/40"
            >
              {title}
            </span>
          )
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{kindLabel(kind)}</span>
            <span aria-hidden>·</span>
            <span>{statusLabel(status)}</span>
            {task.repo ? (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono">{task.repo}</span>
              </>
            ) : null}
          </span>
        }
      />

      <div className="reveal-staged container space-y-5 pb-8 pt-2">
        {/* Actions in a sticky bar (top-12) so they stay reachable once the header
            tucks behind the desktop title bar — same pattern as the session page. */}
        <StickyToolbar className="reveal-controls">
          <div className="flex items-center gap-2">
            <BackLink href="/tasks" label={t('allTasks')} />
          </div>
          <div className="flex items-center gap-2">
            <StatusSelect
              status={status}
              onChange={(next) => void changeStatus(next)}
              disabled={statusSelectBusy}
              align="right"
              variant="chip"
            />
            <PrioritySelect
              priority={priority}
              onChange={(next) => void changePriority(next)}
              align="right"
              variant="chip"
            />
            {projects.length > 0 ? (
              <ProjectSelect
                projects={projects}
                value={projectId}
                onChange={(next) => void reassign(next)}
                disabled={projectBusy}
                align="right"
              />
            ) : null}
            <TaskActionButtons task={displayTask} actions={actions} showSession onOpenSession={goToSession} />
            {isMobile ? (
              <>
                <RailHeaderToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
                <RailHeaderToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
              </>
            ) : null}
          </div>
        </StickyToolbar>

        <RailShell
          isMobile={isMobile}
          left={{
            title: t('runs.title'),
            open: leftOpen,
            onToggle: () => setLeftOpen(!leftOpen),
            content: <RunTimeline taskId={task.id} />,
          }}
          right={{
            title: t('activity.title'),
            open: rightOpen,
            onToggle: () => setRightOpen(!rightOpen),
            content: <Timeline events={task.events} />,
          }}
        >
          {/* Center — the task body + its Details / Review / Retro tabs. Chromeless:
              the page owns the header + actions; the rails own runs + activity. */}
          <div className="overflow-hidden rounded-lg border border-border/60 bg-card/30">
            <TaskDetail
              task={task}
              projects={projects}
              tasks={tasks}
              onClose={onClose}
              variant="page"
              tab={tab}
              onTabChange={onTabChange}
              hideHeader
              hideAgentRuns
              hideActivity
            />
          </div>
        </RailShell>
      </div>
    </>
  );
}
