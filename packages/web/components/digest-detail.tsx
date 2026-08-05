'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import type { Digest } from '@midnite/shared';

import { cn } from '@/lib/utils';
import { exportDigest } from '@/lib/api';
import { ExportMenu } from '@/components/export-menu';
import { useLocaleFormat } from '@/lib/use-locale-format';

/** A digest's from/to dates in the active locale's medium date style. */
function useDateLabel(): (iso: string) => string {
  const { dateTime } = useLocaleFormat();
  return (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : dateTime(d, { dateStyle: 'medium' });
  };
}

/** `2h 5m` / `3m` / `8s` / `—` from milliseconds, unit suffixes translated. */
function useMsLabel(): (ms: number | null) => string {
  const t = useTranslations('digests');
  const { number } = useLocaleFormat();
  return (ms) => {
    if (ms === null) return t('detail.noValue');
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 60) return t('detail.duration.seconds', { value: number(totalSec) });
    const totalMin = Math.floor(totalSec / 60);
    if (totalMin < 60) return t('detail.duration.minutes', { value: number(totalMin) });
    const hr = Math.floor(totalMin / 60);
    if (hr < 24) {
      return t('detail.duration.hoursMinutes', { hours: number(hr), minutes: number(totalMin % 60) });
    }
    return t('detail.duration.daysHours', { days: number(Math.floor(hr / 24)), hours: number(hr % 24) });
  };
}

/** Digest spend is harvested in USD; only the locale's formatting is dynamic. */
function useUsdLabel(): (n: number) => string {
  const { number } = useLocaleFormat();
  return (n) => number(n, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-lg border surface-glass px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'bad' && 'text-rose-600 dark:text-rose-400',
          tone === 'warn' && 'text-amber-600 dark:text-amber-400',
          !tone && 'text-foreground',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: Digest['highlights'][number]['outcome'] }) {
  const t = useTranslations('digests');
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
        outcome === 'done'
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      )}
    >
      {outcome === 'done' ? t('detail.shipped') : t('detail.abandoned')}
    </span>
  );
}

/**
 * Phase 62 G — the structured render of one fleet digest. Deliberately renders
 * the structured fields (counts / spend / cycle / sections / highlights) rather
 * than the stored markdown, so highlights deep-link into the tasks they call out.
 * The pre-rendered markdown backs the ExportMenu only.
 */
export function DigestDetail({ digest }: { digest: Digest }) {
  const t = useTranslations('digests');
  const fmtDate = useDateLabel();
  const formatMs = useMsLabel();
  const usd = useUsdLabel();
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{digest.headline}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('detail.dateRange', { from: fmtDate(digest.from), to: fmtDate(digest.to) })}
          </p>
        </div>
        <ExportMenu fetchMarkdown={() => exportDigest(digest.id)} filename={`digest-${digest.id}`} iconOnly />
      </div>

      {/* Outcome tallies */}
      <section>
        <SectionTitle>{t('detail.outcomes')}</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <StatChip label={t('detail.shipped')} value={String(digest.counts.shipped)} tone="good" />
          <StatChip label={t('detail.failed')} value={String(digest.counts.failed)} tone="bad" />
          <StatChip
            label={t('detail.needsAttention')}
            value={String(digest.counts.needsAttention)}
            tone="warn"
          />
        </div>
      </section>

      {/* Spend (best-effort) */}
      {digest.spend && (
        <section>
          <SectionTitle>{t('detail.spend')}</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <StatChip label={t('detail.total')} value={usd(digest.spend.totalUsd)} />
            <StatChip label={t('detail.measured')} value={usd(digest.spend.measuredUsd)} />
            <StatChip label={t('detail.sessions')} value={String(digest.spend.sessions)} />
          </div>
        </section>
      )}

      {/* Cycle time (best-effort) */}
      {digest.cycle && (
        <section>
          <SectionTitle>{t('detail.cycleTime')}</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <StatChip label={t('detail.tasks')} value={String(digest.cycle.tasks)} />
            <StatChip label={t('detail.p50')} value={formatMs(digest.cycle.p50Ms)} />
            <StatChip label={t('detail.p90')} value={formatMs(digest.cycle.p90Ms)} />
          </div>
        </section>
      )}

      {/* Per-repo/project sections */}
      {digest.sections.length > 0 && (
        <section>
          <SectionTitle>{t('detail.bySection')}</SectionTitle>
          <ul className="divide-y rounded-lg border surface-glass">
            {digest.sections.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="truncate font-medium text-foreground">{s.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {t('feed.shipped', { count: s.shipped })}
                  </span>
                  {' · '}
                  <span className="text-rose-600 dark:text-rose-400">
                    {t('feed.failed', { count: s.failed })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Highlights — deep-link into the called-out task */}
      {digest.highlights.length > 0 && (
        <section>
          <SectionTitle>{t('detail.highlights')}</SectionTitle>
          <ul className="space-y-1.5">
            {digest.highlights.map((h) => (
              <li key={h.taskId}>
                <Link
                  href={`/tasks?task=${encodeURIComponent(h.taskId)}`}
                  className="group flex items-center gap-3 rounded-lg border surface-glass-interactive px-3 py-2 text-sm transition-colors hover:border-primary/50"
                >
                  <OutcomeBadge outcome={h.outcome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{h.title}</span>
                    <span className="block truncate text-muted-foreground">{h.note}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
