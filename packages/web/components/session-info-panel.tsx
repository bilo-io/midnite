'use client';

import { useTranslations } from 'next-intl';
import { LLM_PROVIDER_LABEL, type SessionDetail } from '@midnite/shared';
import { useRelativeTimeLabel, useSessionStatusLabel } from '@/lib/i18n-labels';
import { useLocaleFormat } from '@/lib/use-locale-format';
import { cn } from '@/lib/utils';
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
  const t = useTranslations('sessions');
  const statusLabel = useSessionStatusLabel();
  const relativeTime = useRelativeTimeLabel();
  const absolute = useAbsoluteLabel();
  const formatDuration = useDurationLabel();
  const ended = session.status === 'completed' || Boolean(session.archivedAt);
  const uptime = useUptime(session, ended, formatDuration, absolute);
  const provider = session.provider ? LLM_PROVIDER_LABEL[session.provider] : undefined;
  const showContext = session.contextTokens != null && session.contextLimit != null;

  return (
    <dl className="space-y-2.5 text-xs">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="shrink-0 text-muted-foreground">{t('info.status')}</dt>
        <dd className="min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `hsl(var(${STATUS_HUE[session.status]}) / 0.15)`,
              color: `hsl(var(${STATUS_HUE[session.status]}))`,
            }}
          >
            {ended ? t('status.endedPill') : statusLabel(session.status).toLocaleLowerCase()}
          </span>
        </dd>
      </div>
      {provider ? <Row label={t('info.provider')} value={provider} /> : null}
      {session.agentCli ? <Row label={t('info.agentCli')} value={session.agentCli} mono /> : null}
      {uptime ? (
        <Row
          label={ended ? t('info.ranFor') : t('info.uptime')}
          value={uptime.text}
          title={uptime.title}
        />
      ) : null}
      <Row
        label={t('info.lastActivity')}
        value={relativeTime(session.lastActivity)}
        title={absolute(session.lastActivity)}
      />
      {session.cwd ? (
        <div>
          <dt className="text-muted-foreground">{t('info.workingDir')}</dt>
          <dd className="mt-0.5 break-all font-mono text-[11px] text-foreground/90" title={session.cwd}>
            {session.cwd}
          </dd>
        </div>
      ) : null}
      {session.retryCount != null && session.retryCount > 0 ? (
        <Row label={t('info.retries')} value={String(session.retryCount)} mono />
      ) : null}
      {session.archivedAt ? (
        <Row
          label={t('info.archived')}
          value={relativeTime(session.archivedAt)}
          title={absolute(session.archivedAt)}
        />
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
  const t = useTranslations('sessions');
  const formatTokens = useTokensLabel();
  const pct = limit > 0 ? Math.min(100, Math.round((tokens / limit) * 100)) : 0;
  const args = { tokens: formatTokens(tokens), limit: formatTokens(limit) };
  const label = estimate ? t('info.contextValueEstimate', args) : t('info.contextValue', args);
  return (
    <div className="pt-1">
      <div className="flex items-baseline justify-between gap-3">
        <dt
          className="flex items-center gap-1 text-muted-foreground"
          title={estimate ? t('info.estTitle') : undefined}
        >
          {t('info.context')}
          {estimate ? (
            <span className="rounded bg-muted px-1 text-[9px] uppercase tracking-wide">
              {t('info.estBadge')}
            </span>
          ) : null}
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
function useUptime(
  session: SessionDetail,
  ended: boolean,
  formatDuration: (ms: number) => string,
  absolute: (input: string | number) => string,
): Uptime | null {
  const t = useTranslations('sessions');
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
  return { text: formatDuration(ms), title: t('info.startedTitle', { when: absolute(session.createdAt) }) };
}

/** Duration unit suffixes are catalog copy; the digits follow the active locale. */
function useDurationLabel(): (ms: number) => string {
  const t = useTranslations('sessions');
  const { number } = useLocaleFormat();
  return (ms) => {
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return t('info.duration.seconds', { value: number(secs) });
    const mins = Math.floor(secs / 60);
    if (mins < 60) return t('info.duration.minutes', { value: number(mins) });
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return t('info.duration.hoursMinutes', { hours: number(hours), minutes: number(mins % 60) });
    }
    return t('info.duration.daysHours', { days: number(Math.floor(hours / 24)), hours: number(hours % 24) });
  };
}

/** `1.2M` / `8.5k` / `640` — the `M`/`k` suffix is copy, the number is formatted. */
function useTokensLabel(): (n: number) => string {
  const t = useTranslations('sessions');
  const { number } = useLocaleFormat();
  const one = (v: number) => number(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (n) => {
    if (n >= 1_000_000) return t('info.tokens.millions', { value: one(n / 1_000_000) });
    if (n >= 1_000) return t('info.tokens.thousands', { value: one(n / 1_000) });
    return number(n);
  };
}

/** A full timestamp for the hover titles, in the active locale (was the browser's). */
function useAbsoluteLabel(): (input: string | number) => string {
  const { dateTime } = useLocaleFormat();
  return (input) => {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? '' : dateTime(d, { dateStyle: 'medium', timeStyle: 'medium' });
  };
}
