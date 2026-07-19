import Link from 'next/link';
import { ArrowUpRight, BotMessageSquare } from 'lucide-react';
import type { SessionStatus, SessionSummary } from '@midnite/shared';
import { ContextRing } from '@midnite/ui';
import { ProjectTag } from '@/components/project-tag';
import { SelectableIcon } from '@/components/selectable-icon';
import type { ProjectTagInfo } from '@/components/task-card';
import { cn } from '@/lib/utils';

export const SESSION_STATUS_HUE: Record<SessionStatus, string> = {
  running: '142 71% 45%',
  waiting: '38 92% 50%',
  completed: '217 91% 60%',
  idle: '215 14% 52%',
};

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  running: 'Running',
  waiting: 'Waiting',
  completed: 'Completed',
  idle: 'Idle',
};

export function SessionStatusDot({ status }: { status: SessionStatus }) {
  const hue = SESSION_STATUS_HUE[status];
  return (
    <span
      // role="img" gives this status dot a name-supporting role; a bare <span> doesn't
      // support aria-label (axe aria-prohibited-attr).
      role="img"
      aria-label={SESSION_STATUS_LABEL[status]}
      title={SESSION_STATUS_LABEL[status]}
      className={cn('h-2 w-2 rounded-full shrink-0', status === 'running' && 'animate-pulse')}
      style={{
        background: `hsl(${hue})`,
        boxShadow: `0 0 8px -1px hsl(${hue} / 0.7)`,
      }}
    />
  );
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

type SelectProps = {
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
};

/** The leading select affordance, or null when the view isn't selectable. */
function SessionSelect({ selected, onToggleSelect }: SelectProps) {
  if (!onToggleSelect) return null;
  return <SelectableIcon Icon={BotMessageSquare} selected={selected ?? false} onToggle={(sk) => onToggleSelect?.(sk)} />;
}

/**
 * Explicit link into the session cockpit (Phase 51 F). A real anchor — so
 * cmd/middle-click opens the detail page in a new tab — sitting alongside the
 * card's quick-view modal. `stopPropagation` keeps a click here from also firing
 * the card's modal onClick.
 */
function OpenDetailLink({ sessionId }: { sessionId: string }) {
  return (
    <Link
      href={`/sessions/view?id=${sessionId}`}
      onClick={(e) => e.stopPropagation()}
      aria-label="Open session page"
      title="Open session page"
      className="shrink-0 rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
    >
      <ArrowUpRight className="h-4 w-4" />
    </Link>
  );
}

/** A session as a flat table row, used inside the Sessions table accordions. */
export function SessionRow({
  session,
  project,
  onClick,
  selected = false,
  onToggleSelect,
}: {
  session: SessionSummary;
  project?: ProjectTagInfo;
  onClick: () => void;
} & SelectProps) {
  return (
    <div
      className={cn(
        'group flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 transition-colors last:border-b-0 hover:bg-accent/40',
        selected && 'bg-accent/30',
      )}
    >
      <SessionSelect selected={selected} onToggleSelect={onToggleSelect} />
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <SessionStatusDot status={session.status} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug">{session.title}</p>
          {session.subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{session.subtitle}</p>
          ) : null}
        </div>
        {project ? (
          <ProjectTag tag={project.tag} color={project.color} className="shrink-0" />
        ) : null}
        {session.contextTokens != null && session.contextLimit != null ? (
          <ContextRing tokens={session.contextTokens} limit={session.contextLimit} />
        ) : null}
        <span className="hidden shrink-0 truncate font-mono text-xs text-muted-foreground sm:inline">
          {session.projectDisplay}
        </span>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {relativeTime(session.lastActivity)}
        </span>
      </button>
      <OpenDetailLink sessionId={session.id} />
    </div>
  );
}

type Props = {
  session: SessionSummary;
  layout: 'list' | 'grid';
  onClick: () => void;
} & SelectProps;

export function SessionCard({ session, layout, onClick, selected = false, onToggleSelect }: Props) {
  if (layout === 'list') {
    return (
      <div
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-accent/40 hover:border-foreground/20',
          selected && 'border-primary/50 bg-accent/30',
        )}
      >
        <SessionSelect selected={selected} onToggleSelect={onToggleSelect} />
        <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <SessionStatusDot status={session.status} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-snug">{session.title}</p>
            {session.subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{session.subtitle}</p>
            ) : null}
          </div>
          {session.contextTokens != null && session.contextLimit != null ? (
            <ContextRing tokens={session.contextTokens} limit={session.contextLimit} />
          ) : null}
          <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
            <p className="truncate font-mono">{session.projectDisplay}</p>
            <p>{relativeTime(session.lastActivity)}</p>
          </div>
        </button>
        <OpenDetailLink sessionId={session.id} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex flex-col gap-2 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-accent/40 hover:border-foreground/20',
        selected && 'border-primary/50 bg-accent/30',
      )}
    >
      <div className="flex items-center gap-2">
        <SessionSelect selected={selected} onToggleSelect={onToggleSelect} />
        <SessionStatusDot status={session.status} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {SESSION_STATUS_LABEL[session.status]}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {session.contextTokens != null && session.contextLimit != null ? (
            <ContextRing tokens={session.contextTokens} limit={session.contextLimit} />
          ) : null}
          <OpenDetailLink sessionId={session.id} />
        </div>
      </div>
      <button type="button" onClick={onClick} className="flex flex-1 flex-col gap-2 text-left">
        <p className="text-sm font-medium leading-snug line-clamp-2">{session.title}</p>
        {session.subtitle ? (
          <p className="text-xs text-muted-foreground line-clamp-3">{session.subtitle}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate font-mono">{session.projectDisplay}</span>
          <span className="shrink-0">{relativeTime(session.lastActivity)}</span>
        </div>
      </button>
    </div>
  );
}
