'use client';

import { RefreshCw, TerminalSquare } from 'lucide-react';
import type { SessionStatus, SessionSummary } from '@midnite/shared';
import { getSessions } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn, relativeTime } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 30_000;
const MAX_ROWS = 8;

// Most "live" first; completed sinks to the bottom.
const STATUS_ORDER: Record<SessionStatus, number> = { running: 0, waiting: 1, idle: 2, completed: 3 };

const STATUS_DOT: Record<SessionStatus, string> = {
  running: 'bg-emerald-500',
  waiting: 'bg-amber-500',
  idle: 'bg-muted-foreground/40',
  completed: 'bg-sky-500',
};

export function SessionsWidget() {
  const { data, error, loading, refresh } = usePolling(() => getSessions(), REFRESH_MS);

  const sessions = (data ?? [])
    .filter((s) => !s.archivedAt)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.lastActivity - a.lastActivity)
    .slice(0, MAX_ROWS);

  return (
    <WidgetCard
      title="Live sessions"
      icon={TerminalSquare}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh sessions"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load sessions.</p>
      ) : !data && loading ? (
        <WidgetLoader />
      ) : sessions.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No active sessions.</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function SessionRow({ session }: { session: SessionSummary }) {
  const pct =
    session.contextTokens != null && session.contextLimit
      ? Math.min(100, Math.round((session.contextTokens / session.contextLimit) * 100))
      : null;

  return (
    <li className="px-4 py-2">
      <div className="flex items-center gap-2">
        <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[session.status])} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{session.title}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {relativeTime(session.lastActivity)}
        </span>
      </div>
      <div className="ml-4 mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{session.projectDisplay}</span>
        <span className="capitalize">· {session.status}</span>
      </div>
      {pct != null && (
        <div className="ml-4 mt-1 h-1 overflow-hidden rounded-full bg-border/50" title={`Context ${pct}%`}>
          <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
        </div>
      )}
    </li>
  );
}
