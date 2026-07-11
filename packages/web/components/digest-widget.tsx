'use client';

import Link from 'next/link';
import { ArrowRight, Newspaper, RefreshCw } from 'lucide-react';
import { getDigests } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn, relativeTime } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;

function Tally({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn('text-lg font-semibold tabular-nums', tone)}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

/** Latest fleet digest at a glance (Phase 62 G) — headline + shipped/failed/attention tallies. */
export function DigestWidget() {
  const { data, error, loading, refresh } = usePolling(() => getDigests(1), REFRESH_MS);
  const latest = data?.[0];

  return (
    <WidgetCard
      title="Latest digest"
      icon={Newspaper}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh latest digest"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load digests.</p>
      ) : !data && loading ? (
        <WidgetLoader />
      ) : !latest ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No digests yet.</p>
      ) : (
        <div className="flex h-full flex-col gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="line-clamp-2 text-sm font-medium text-foreground">{latest.headline}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{relativeTime(latest.createdAt)}</div>
          </div>
          <div className="flex items-center justify-around border-t pt-3">
            <Tally value={latest.counts.shipped} label="shipped" tone="text-emerald-600 dark:text-emerald-400" />
            <Tally value={latest.counts.failed} label="failed" tone="text-red-600 dark:text-red-400" />
            <Tally value={latest.counts.needsAttention} label="attention" tone="text-amber-600 dark:text-amber-400" />
          </div>
          <Link
            href={`/digests?id=${encodeURIComponent(latest.id)}`}
            className="mt-auto inline-flex items-center gap-1 self-end text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View all <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      )}
    </WidgetCard>
  );
}
