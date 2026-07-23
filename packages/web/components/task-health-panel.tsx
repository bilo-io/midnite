'use client';

import Link from 'next/link';
import { AlertTriangle, Clock, Hourglass, PauseCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FAILURE_CLASSES, type DoctorTaskRef, type TasksDoctorReport } from '@midnite/shared';
import { useWaitReasonLabel } from '@/lib/i18n-labels';

/** Phase 53 E — the operator's "what's wedged?" panel on the Ops page: derived
 *  needs-attention / stuck / aged / waiting-too-long buckets + failure counts. */
export function TaskHealthPanel({ report }: { report: TasksDoctorReport | null | undefined }) {
  const t = useTranslations('task');
  if (!report) return null;
  const failureCounts = Object.entries(report.failureCountsByClass).sort((a, b) => b[1] - a[1]);
  const knownClasses = new Set<string>(FAILURE_CLASSES);
  const empty =
    report.needsAttention.length === 0 &&
    report.stuckWip.length === 0 &&
    report.agedTodo.length === 0 &&
    report.recentFailures.length === 0;

  return (
    <section aria-labelledby="task-health-heading" className="rounded-lg border surface-glass p-4">
      <h2 id="task-health-heading" className="mb-3 text-sm font-semibold">
        {t('health.title')}
      </h2>
      {empty ? (
        <p className="text-sm text-muted-foreground">{t('health.empty')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Bucket
            title={t('health.needsAttention')}
            Icon={AlertTriangle}
            tone="text-destructive"
            rows={report.needsAttention}
            reason
          />
          <Bucket
            title={t('health.waitingTooLong')}
            Icon={Hourglass}
            tone="text-amber-600 dark:text-amber-400"
            rows={report.waitingTooLong}
            reason
            since
          />
          <Bucket
            title={t('health.stuckWip')}
            Icon={PauseCircle}
            tone="text-amber-600 dark:text-amber-400"
            rows={report.stuckWip}
            since
          />
          <Bucket
            title={t('health.agedTodo')}
            Icon={Clock}
            tone="text-muted-foreground"
            rows={report.agedTodo}
            since
          />
        </div>
      )}
      {failureCounts.length > 0 ? (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('health.recentFailures', { count: report.recentFailures.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            {failureCounts.map(([cls, n]) => (
              <span
                key={cls}
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium"
              >
                {knownClasses.has(cls) ? t(`failures.classes.${cls}`) : cls}
                <span className="text-muted-foreground">{n}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Bucket({
  title,
  Icon,
  tone,
  rows,
  reason,
  since,
}: {
  title: string;
  Icon: typeof AlertTriangle;
  tone: string;
  rows: DoctorTaskRef[];
  reason?: boolean;
  since?: boolean;
}) {
  const t = useTranslations('task');
  const waitReasonLabel = useWaitReasonLabel();
  return (
    <div>
      <p className={`mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${tone}`}>
        <Icon aria-hidden className="h-3.5 w-3.5" />
        {title}
        <span className="text-muted-foreground">({rows.length})</span>
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('health.none')}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.id} className="truncate text-sm">
              <Link href={`/tasks/view?id=${encodeURIComponent(r.id)}`} className="hover:underline">
                {r.title}
              </Link>
              {reason && r.waitReason ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  · {waitReasonLabel(r.waitReason)}
                </span>
              ) : null}
              {since ? <span className="ml-1 text-xs text-muted-foreground">· {humanMs(r.sinceMs)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Compact human duration: 45m, 3h, 2d. */
function humanMs(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
