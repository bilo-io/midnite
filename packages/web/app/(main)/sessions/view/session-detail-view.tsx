'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Project, SessionDetail, Task } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
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
  const { data, loading, error } = useApiData(async () => {
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

  const back = (
    <Link
      href="/sessions"
      className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      All sessions
    </Link>
  );

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

  return <SessionDetailView session={data.session} task={data.task} project={data.project} />;
}

// Phase 51 B — the session cockpit shell: a large center region (the terminal
// lands in Theme C) flanked by two independently collapsible, state-persisted
// rails (approvals/context in Theme D, info/stats in Theme E). On mobile the rails
// become header-toggled drawers and the center goes full-width.

const STATUS_HUE: Record<SessionDetail['status'], string> = {
  running: '--status-wip',
  waiting: '--status-waiting',
  completed: '--status-done',
  idle: '--status-backlog',
};

export function SessionDetailView({
  session,
  task,
  project,
}: {
  session: SessionDetail;
  task: Task | null;
  project: Project | null;
}) {
  const [leftOpen, setLeftOpen] = useLocalStorage<boolean>('midnite.session.leftOpen', true);
  const [rightOpen, setRightOpen] = useLocalStorage<boolean>('midnite.session.rightOpen', true);
  const isMobile = useIsMobile();

  const ended = session.status === 'completed' || Boolean(session.archivedAt);

  return (
    <>
      <PageHeader
        title={session.title}
        icon="BotMessageSquare"
        description={session.subtitle || undefined}
        actions={
          <div className="flex items-center gap-2">
            <ConnectionStatus variant="compact" />
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `hsl(var(${STATUS_HUE[session.status]}) / 0.15)`,
                color: `hsl(var(${STATUS_HUE[session.status]}))`,
              }}
            >
              {ended ? 'ended' : session.status}
            </span>
            {/* On mobile the rails are drawers toggled from here. */}
            {isMobile ? (
              <>
                <RailHeaderToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
                <RailHeaderToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
              </>
            ) : null}
            <Link
              href="/sessions"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Sessions
            </Link>
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

