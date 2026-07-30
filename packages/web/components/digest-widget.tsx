'use client';

import Link from 'next/link';
import { ArrowRight, Newspaper, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DigestListItem } from '@midnite/shared';

import { getDigests } from '@/lib/api';
import { useLocaleFormat } from '@/lib/use-locale-format';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 120_000;

function Count({ label, value, tone }: { label: string; value: number; tone: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          'text-xl font-semibold tabular-nums',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'bad' && 'text-rose-600 dark:text-rose-400',
          tone === 'warn' && 'text-amber-600 dark:text-amber-400',
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Phase 62 G — the latest-digest dashboard widget. Shows the most recent fleet
 * digest's headline + shipped/failed/attention counts and deep-links to the feed.
 * Honest empty state when no digest has been produced yet.
 */
export function DigestWidget() {
  const t = useTranslations('dashboard');
  const { data, error, loading, refresh } = usePolling<DigestListItem[]>(() => getDigests(1), REFRESH_MS);
  const latest = data?.[0] ?? null;
  const { dateTime } = useLocaleFormat();
  const fmtDate = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : dateTime(d, { dateStyle: 'medium' });
  };

  return (
    <WidgetCard
      title={t('digest.title')}
      icon={Newspaper}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label={t('digest.refresh')}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="flex flex-col p-4"
    >
      {error && !latest ? (
        <p className="m-auto text-sm text-destructive">{t('digest.error')}</p>
      ) : !data && loading ? (
        <p className="m-auto text-sm text-muted-foreground">{t('digest.loading')}</p>
      ) : !latest ? (
        <p className="m-auto max-w-[28ch] text-center text-sm text-muted-foreground">
          {t('digest.empty')}
        </p>
      ) : (
        <Link
          href={`/ops?tab=digest&id=${encodeURIComponent(latest.id)}`}
          className="group flex flex-1 flex-col justify-between gap-3 rounded-lg -m-1 p-1 transition-colors hover:bg-accent/50"
        >
          <div>
            <div className="text-xs text-muted-foreground">{fmtDate(latest.createdAt)}</div>
            <p className="mt-1 line-clamp-3 text-sm font-medium text-foreground">{latest.headline}</p>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex gap-4">
              <Count label={t('digest.shipped')} value={latest.counts.shipped} tone="good" />
              <Count label={t('digest.failed')} value={latest.counts.failed} tone="bad" />
              <Count label={t('digest.attention')} value={latest.counts.needsAttention} tone="warn" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </Link>
      )}
    </WidgetCard>
  );
}
