'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Project, SessionDetail, Task } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { BackLink } from '@/components/back-link';
import { TaskActionButtons, useTaskActions } from '@/components/task-actions';
import { useToast } from '@/components/toast';
import { ConnectionStatus } from '@/components/connection-status';
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
    document.title = `${data.session.title} · midnite`;
    return () => {
      document.title = previous;
    };
  }, [data?.session]);

  const back = <BackLink href="/sessions" label="All sessions" className="mb-4" />;

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
        <p className="text-sm text-muted-foreground">Loading…</p>
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
  const [leftOpen, setLeftOpen] = useLocalStorage<boolean>('midnite.session.leftOpen', true);
  const [rightOpen, setRightOpen] = useLocalStorage<boolean>('midnite.session.rightOpen', true);
  const isMobile = useIsMobile();

  return (
    <>
      <PageHeader
        title={session.title}
        icon="BotMessageSquare"
        description={session.subtitle || undefined}
        actions={
          <div className="flex items-center gap-2">
            {/* The linked task's lifecycle actions (Phase 74) — start / abandon /
                reopen / export / delete, icon-only with a label on hover. */}
            {task ? <LinkedTaskActions task={task} onChanged={() => onTaskChanged?.()} /> : null}
            <ConnectionStatus variant="compact" />
            {/* The session status lives in the Session info panel now (as a pill),
                so it isn't duplicated up here beside the action buttons. */}
            {/* On mobile the rails are drawers toggled from here. */}
            {isMobile ? (
              <>
                <RailHeaderToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
                <RailHeaderToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
              </>
            ) : null}
          </div>
        }
      />

      <div className="reveal-staged container space-y-5 pb-8 pt-2">
        <RailShell
          isMobile={isMobile}
          left={{
            title: 'Approvals & context',
            open: leftOpen,
            onToggle: () => setLeftOpen(!leftOpen),
            content: <SessionLeftPanel session={session} task={task} project={project} />,
          }}
          right={{
            title: 'Session info',
            open: rightOpen,
            onToggle: () => setRightOpen(!rightOpen),
            content: <SessionInfoPanel session={session} />,
          }}
        >
          {/* Center — the terminal: live WS terminal or ended transcript. */}
          <SessionTerminalRegion session={session} />
        </RailShell>
      </div>
    </>
  );
}

