'use client';

import { LLM_PROVIDER_LABEL, type SessionDetail } from '@midnite/shared';
import { cn, relativeTime } from '@/lib/utils';
import { SessionCostLine } from './session-cost-line';

// Status → the status-hue CSS var, so the Status pill tints itself the same way
// the board / task chips do (moved here from the page header — Phase 74).
const STATUS_HUE: Record<SessionDetail['status'], string> = {
  running: '--status-wip',
  waiting: '--status-waiting',
  completed: '--status-done',
  idle: '--status-backlog',
};

/**
 * The session cockpit's right-rail readout (Phase 51 E) — an instrument panel of
 * the fields that genuinely exist on a session, honest about what's real. Rows
 * whose value is absent are omitted entirely (Decision: graceful degradation), so
 * a sparse session shows a tight list rather than a wall of em-dashes. Uptime is
 * the session's lifespan (frozen at the end for an ended session); the context
 * window is shown as a bar explicitly labeled an estimate (Decision §4).
 */
export function SessionInfoPanel({ session }: { session: SessionDetail }) {
  const ended = session.status === 'completed' || Boolean(session.archivedAt);
  const uptime = computeUptime(session, ended);
  const provider = session.provider ? LLM_PROVIDER_LABEL[session.provider] : undefined;
  const showContext = session.contextTokens != null && session.contextLimit != null;

  return (
    <dl className="space-y-2.5 text-xs">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="shrink-0 text-muted-foreground">Status</dt>
        <dd className="min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `hsl(var(${STATUS_HUE[session.status]}) / 0.15)`,
              color: `hsl(var(${STATUS_HUE[session.status]}))`,
            }}
          >
            {ended ? 'ended' : session.status}
          </span>
        </dd>
      </div>
      {provider ? <Row label="Provider" value={provider} /> : null}
      {session.agentCli ? <Row label="Agent CLI" value={session.agentCli} mono /> : null}
      {uptime ? (
        <Row
          label={ended ? 'Ran for' : 'Uptime'}
          value={uptime.text}
          title={uptime.title}
        />
      ) : null}
      <Row label="Last activity" value={relativeTime(session.lastActivity)} title={absolute(session.lastActivity)} />
      {session.cwd ? (
        <div>
          <dt className="text-muted-foreground">Working dir</dt>
          <dd className="mt-0.5 break-all font-mono text-[11px] text-foreground/90" title={session.cwd}>
            {session.cwd}
          </dd>
        </div>
      ) : null}
      {session.retryCount != null && session.retryCount > 0 ? (
        <Row label="Retries" value={String(session.retryCount)} mono />
      ) : null}
      {session.archivedAt ? (
        <Row label="Archived" value={relativeTime(session.archivedAt)} title={absolute(session.archivedAt)} />
      ) : null}
      {showContext ? (
        <ContextBar
          tokens={session.contextTokens as number}
          limit={session.contextLimit as number}
          estimate={Boolean(session.contextEstimate)}
        />
      ) : null}
      <SessionCostLine sessionId={session.id} />
    </dl>
  );
}

function Row({ label, value, title, mono }: { label: string; value: string; title?: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 truncate text-right text-foreground/90', mono && 'font-mono')} title={title ?? value}>
        {value}
      </dd>
    </div>
  );
}

/** The (estimated) context window as a labeled bar — never fabricated precision. */
function ContextBar({ tokens, limit, estimate }: { tokens: number; limit: number; estimate: boolean }) {
  const pct = limit > 0 ? Math.min(100, Math.round((tokens / limit) * 100)) : 0;
  const label = `${formatTokens(tokens)} / ${formatTokens(limit)}${estimate ? ' (est.)' : ''}`;
  return (
    <div className="pt-1">
      <div className="flex items-baseline justify-between gap-3">
        <dt
          className="flex items-center gap-1 text-muted-foreground"
          title={estimate ? 'Approximate — hash-seeded, not a measured token count' : undefined}
        >
          Context
          {estimate ? <span className="rounded bg-muted px-1 text-[9px] uppercase tracking-wide">est</span> : null}
        </dt>
        <dd className="min-w-0 truncate text-right font-mono text-foreground/90">{label}</dd>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type Uptime = { text: string; title: string };

/** Session lifespan: created → now (live) or created → end (ended). Null if unknown. */
function computeUptime(session: SessionDetail, ended: boolean): Uptime | null {
  if (!session.createdAt) return null;
  const start = new Date(session.createdAt).getTime();
  if (!Number.isFinite(start)) return null;
  const end = ended
    ? session.archivedAt
      ? new Date(session.archivedAt).getTime()
      : session.lastActivity
    : Date.now();
  const ms = end - start;
  if (!Number.isFinite(ms) || ms < 0) return null;
  return { text: formatDuration(ms), title: `Started ${absolute(session.createdAt)}` };
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function absolute(input: string | number): string {
  try {
    return new Date(input).toLocaleString();
  } catch {
    return '';
  }
}
