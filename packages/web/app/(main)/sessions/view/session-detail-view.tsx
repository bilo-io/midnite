'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { ListChecks } from 'lucide-react';
import type { Project, SessionDetail, Task } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { BackLink } from '@/components/back-link';
import { HoverExpandButton } from '@/components/hover-expand-button';
import { TaskActionButtons, useTaskActions } from '@/components/task-actions';
import { taskPageHref } from '@/lib/task-route';
import { useToast } from '@/components/toast';
import { SessionInfoPanel } from '@/components/session-info-panel';
import { SessionTerminalRegion } from '@/components/session-terminal-region';
import { ResourceNotFound } from '@/components/resource-not-found';
import { RailShell, RailHeaderToggle } from '@midnite/ui';
import { getProject, getSession, getTask } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsMobile } from '@/hooks/use-media-query';
import { SessionLeftPanel } from './session-left-panel';

/**
 * Container (Phase 51 B): reads `?id=`, fetches the session + its linked task +
 * that task's project, and renders the cockpit — with inline loading / not-found
 * states so a bookmarked deep link resolves standalone (Decision §1).
 */
export function SessionDetailContainer() {
  const t = useTranslations('sessions');
  const id = useSearchParams().get('id') ?? '';
  const { data, loading, error, refresh } = useApiData(async () => {
    if (!id) return null;
    const session = await getSession(id);
    const task = session.linkedTaskId ? await getTask(session.linkedTaskId).catch(() => null) : null;
    const project = task?.projectId ? await getProject(task.projectId).catch(() => null) : null;
    return { session, task, project };
  }, [id]);

  useEffect(() => {
    if (!data?.session) return;
    const previous = document.title;
    document.title = `${data.session.title} · Midnite`;
    return () => {
      document.title = previous;
    };
  }, [data?.session]);

  const back = <BackLink href="/sessions" label={t('detail.allSessions')} className="mb-4" />;

  if (!id || error || (!loading && !data)) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <ResourceNotFound feature="sessions" singular="session" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-3xl py-6 pb-12">
        {back}
        <p className="text-sm text-muted-foreground">{t('detail.loading')}</p>
      </div>
    );
  }

  return (
    <SessionDetailView session={data.session} task={data.task} project={data.project} onTaskChanged={refresh} />
  );
}

/**
 * The linked task's lifecycle actions, surfaced in the session header (Phase 74)
 * so start / abandon / reopen / export / delete are reachable without hopping to
 * the board. Mutations refresh the cockpit; failures surface as a toast (there's
 * no inline error banner in the header the way the modal body has one).
 */
function LinkedTaskActions({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const actions = useTaskActions({ task, onActionComplete: onChanged });
  const toast = useToast();
  const { statusError, setStatusError } = actions;
  useEffect(() => {
    if (!statusError) return;
    toast.error(statusError);
    setStatusError(null);
  }, [statusError, setStatusError, toast]);
  return <TaskActionButtons task={task} actions={actions} />;
}

// Phase 51 B — the session cockpit shell: a large center region (the terminal
// lands in Theme C) flanked by two independently collapsible, state-persisted
// rails (approvals/context in Theme D, info/stats in Theme E). On mobile the rails
// become header-toggled drawers and the center goes full-width.

export function SessionDetailView({
  session,
  task,
  project,
  onTaskChanged,
}: {
  session: SessionDetail;
  task: Task | null;
  project: Project | null;
  onTaskChanged?: () => void;
}) {
  const t = useTranslations('sessions');
  const tCommon = useTranslations('common');
  const approvalsRail = t('detail.approvalsRail');
  const infoRail = t('detail.infoRail');
  const [leftOpen, setLeftOpen] = useLocalStorage<boolean>('midnite.session.leftOpen', true);
  const [rightOpen, setRightOpen] = useLocalStorage<boolean>('midnite.session.rightOpen', true);
  const isMobile = useIsMobile();
  const router = useRouter();

  return (
    <>
      <PageHeader
        title={session.title}
        icon="BotMessageSquare"
        description={session.subtitle || undefined}
      />

      <div className="reveal-staged container space-y-5 pb-8 pt-2">
        {/* Actions live in a sticky toolbar (top-12), not the collapsing header —
            so start / abandon / reopen / export / delete stay reachable once the
            header tucks behind the desktop title bar, matching the list pages. */}
        <StickyToolbar className="reveal-controls">
          {/* Left slot intentionally empty — the connection pip lived here, but the
              terminal's own live indicator already says the same thing. */}
          <div />
          <div className="flex items-center gap-2">
            {/* Jump to the counterpart task page (session.id === task.id) — mirrors
                the "Session" deep-link the task page carries. */}
            {task ? (
              <HoverExpandButton
                icon={<ListChecks className="h-3.5 w-3.5" />}
                label={t('detail.viewTask')}
                variant="secondary"
                onClick={() => router.push(taskPageHref(task.id))}
              />
            ) : null}
            {/* The linked task's lifecycle actions (Phase 74) — start / abandon /
                reopen / export / delete, icon-only with a label on hover. */}
            {task ? <LinkedTaskActions task={task} onChanged={() => onTaskChanged?.()} /> : null}
            {/* On mobile the rails are drawers toggled from here. */}
            {isMobile ? (
              <>
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
              </>
            ) : null}
          </div>
        </StickyToolbar>

        <RailShell
          isMobile={isMobile}
          left={{
            title: approvalsRail,
            open: leftOpen,
            onToggle: () => setLeftOpen(!leftOpen),
            content: <SessionLeftPanel session={session} task={task} project={project} />,
            collapseLabel: tCommon('ui.rail.collapse', { title: approvalsRail }),
            expandLabel: tCommon('ui.rail.expand', { title: approvalsRail }),
          }}
          right={{
            title: infoRail,
            open: rightOpen,
            onToggle: () => setRightOpen(!rightOpen),
            content: <SessionInfoPanel session={session} />,
            collapseLabel: tCommon('ui.rail.collapse', { title: infoRail }),
            expandLabel: tCommon('ui.rail.expand', { title: infoRail }),
          }}
          /* The band between the rail toggles names what the terminal is working
             on — the linked task — so the cockpit is readable once the page
             header has scrolled away. One line, truncated. */
          centerTitle={
            task ? (
              <span className="min-w-0 truncate text-sm font-medium text-foreground" title={task.title}>
                {task.title}
              </span>
            ) : undefined
          }
        >
          {/* Center — the terminal: live WS terminal or ended transcript. */}
          <SessionTerminalRegion session={session} />
        </RailShell>
      </div>
    </>
  );
}

