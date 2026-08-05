'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, ShieldCheck, X } from 'lucide-react';
import { isTerminal, type ApprovalLogEntry, type Project, type SessionDetail, type Task } from '@midnite/shared';
import { ReplyBox } from '@/components/reply-box';
import { listApprovalLog } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useApprovalsSocket } from '@/hooks/use-approvals-socket';
import { projectPageHref } from '@/lib/project-route';
import { useRelativeTimeLabel, useStatusLabel } from '@/lib/i18n-labels';

/** `task.priority` is 0–3; the wording lives in `board.priority.*` (Theme B). */
const PRIORITY_KEY = ['low', 'normal', 'high', 'urgent'] as const;

/** How a resolved decision reads + colours in the history list. */
const RESOLUTION_STYLE: Record<string, string> = {
  allow: 'text-emerald-500',
  'allow-session': 'text-emerald-500',
  'auto-allow': 'text-emerald-500',
  deny: 'text-destructive',
  'auto-deny': 'text-destructive',
  timeout: 'text-amber-500',
  expired: 'text-amber-500',
  ask: 'text-muted-foreground',
};

/**
 * Phase 51 Theme D — the left rail: what this session is *working and asking for*.
 * Live pending approvals (the shared `useApprovalsSocket`, filtered to this
 * session) + the historical decision log + task / project context.
 */
export function SessionLeftPanel({
  session,
  task,
  project,
}: {
  session: SessionDetail;
  task: Task | null;
  project: Project | null;
}) {
  const t = useTranslations('sessions');
  const tBoard = useTranslations('board');
  const tSettings = useTranslations('settings');
  const statusLabel = useStatusLabel();
  const relativeTime = useRelativeTimeLabel();
  const { pending, deciding, decide } = useApprovalsSocket();
  const live = pending.filter((p) => p.sessionId === session.id);

  const { data: log } = useApiData(
    () => listApprovalLog({ sessionId: session.id, limit: 25 }),
    [session.id],
  );
  const history = log?.entries ?? [];

  // Phase 69 D — a live `needs-input` wait can be answered right here, next to the
  // terminal. `sessionId === session.id` for agent sessions. Dead/needs-attention
  // waits (a failure reason) fall through to the resolve actions elsewhere.
  const liveWait = task?.status === 'waiting' && task.waitReason === 'needs-input';

  return (
    <div className="space-y-5 text-sm">
      {liveWait ? (
        <section className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
            {t('left.agentWaiting')}
          </h3>
          <ReplyBox sessionId={session.id} />
        </section>
      ) : null}
      {/* Live pending approvals for this session. */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> {t('left.pendingApprovals')}
        </h3>
        {live.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('left.nothingPending')}</p>
        ) : (
          <ul className="space-y-2">
            {live.map((a) => (
              <li key={a.id} className="rounded-md border border-border/60 bg-background/60 p-2.5">
                <p className="font-mono text-xs text-foreground">{a.toolName}</p>
                {a.summary ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.summary}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={deciding.has(a.id)}
                    onClick={() => decide(a.id, a.sessionId, 'allow')}
                    className="inline-flex items-center gap-1 rounded border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> {t('left.allow')}
                  </button>
                  <button
                    type="button"
                    disabled={deciding.has(a.id)}
                    onClick={() => decide(a.id, a.sessionId, 'allow_session')}
                    className="inline-flex items-center rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {t('left.allowSession')}
                  </button>
                  <button
                    type="button"
                    disabled={deciding.has(a.id)}
                    onClick={() => decide(a.id, a.sessionId, 'deny')}
                    className="inline-flex items-center gap-1 rounded border border-destructive/40 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" /> {t('left.deny')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historical decisions for this session (recent 25). */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('left.decisionHistory')}
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('left.noDecisions')}</p>
        ) : (
          <ul className="space-y-1.5">
            {history.map((e: ApprovalLogEntry) => (
              <li key={e.id} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-mono text-foreground">{e.toolName}</span>
                  {e.summary ? <span className="text-muted-foreground"> · {e.summary}</span> : null}
                </span>
                <span className={RESOLUTION_STYLE[e.resolution] ?? 'text-muted-foreground'}>
                  {tSettings.has(`approvals.history.resolution.${e.resolution}`)
                    ? tSettings(`approvals.history.resolution.${e.resolution}`)
                    : e.resolution}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Task context. */}
      {task ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('left.task')}
          </h3>
          <Link href={`/tasks/view?id=${task.id}`} className="text-foreground hover:underline">
            {task.title}
          </Link>
          <dl className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>{t('left.status')}</dt>
              <dd className="text-foreground">{statusLabel(task.status)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t('left.priority')}</dt>
              <dd className="text-foreground">
                {PRIORITY_KEY[task.priority]
                  ? tBoard(`priority.${PRIORITY_KEY[task.priority]}`)
                  : task.priority}
              </dd>
            </div>
            {task.retryCount ? (
              <div className="flex justify-between gap-2">
                <dt>{t('left.retries')}</dt>
                <dd className="text-foreground">{task.retryCount}</dd>
              </div>
            ) : null}
            {task.createdAt ? (
              <div className="flex justify-between gap-2">
                <dt>{t('left.created')}</dt>
                <dd className="text-foreground">{relativeTime(task.createdAt)}</dd>
              </div>
            ) : null}
          </dl>
          {/* Phase 62 F — a terminal task always has a retro skeleton; link to it. */}
          {isTerminal(task.status) ? (
            <Link
              href={`/tasks/view?id=${task.id}&tab=retro`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {t('left.viewRetro')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* Project context — absent gracefully. */}
      {project ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('left.project')}
          </h3>
          <Link href={projectPageHref(project.id)} className="text-foreground hover:underline">
            {project.name}
          </Link>
          {project.workDir ? (
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{project.workDir}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
