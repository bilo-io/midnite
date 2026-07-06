'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { Project, SessionDetail, Task } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { ConnectionStatus } from '@/components/connection-status';
import { SessionInfoPanel } from '@/components/session-info-panel';
import { SessionTerminalRegion } from '@/components/session-terminal-region';
import { getProject, getSession, getTask } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
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
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
          Session not found.
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
                <RailToggle side="left" open={leftOpen} onClick={() => setLeftOpen(!leftOpen)} />
                <RailToggle side="right" open={rightOpen} onClick={() => setRightOpen(!rightOpen)} />
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Left rail — approvals + task/project context (Theme D). */}
          <Rail
            side="left"
            open={leftOpen}
            isMobile={isMobile}
            onToggle={() => setLeftOpen(!leftOpen)}
            title="Approvals & context"
          >
            <SessionLeftPanel session={session} task={task} project={project} />
          </Rail>

          {/* Center — the terminal: live WS terminal or ended transcript (Theme C). */}
          <div className="min-w-0 flex-1">
            <SessionTerminalRegion session={session} />
          </div>

          {/* Right rail — session info & stats (Theme E). */}
          <Rail
            side="right"
            open={rightOpen}
            isMobile={isMobile}
            onToggle={() => setRightOpen(!rightOpen)}
            title="Session info"
          >
            <SessionInfoPanel session={session} />
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
  // Collapsed desktop rail: a slim vertical strip with a toggle. Mobile: hidden
  // unless open (drawer-style, toggled from the header).
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
      <div className="mb-2 flex items-center justify-between">
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
  const Icon = side === 'left'
    ? open ? PanelLeftClose : PanelLeftOpen
    : open ? PanelRightClose : PanelRightOpen;
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
