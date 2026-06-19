'use client';

import { BarChart3, RefreshCw } from 'lucide-react';
import { getTasks } from '@/lib/api';
import { completionsByDay } from '@/lib/dashboard-metrics';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;
const WINDOW_DAYS = 14;

export function ThroughputWidget() {
  const { data, error, loading, refresh } = usePolling(() => getTasks(), REFRESH_MS);

  const buckets = data ? completionsByDay(data, WINDOW_DAYS, Date.now()) : [];
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0);
  const lastWeek = buckets.slice(-7).reduce((sum, b) => sum + b.count, 0);

  return (
    <WidgetCard
      title="Throughput"
      icon={BarChart3}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh throughput"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="flex flex-col p-4"
    >
      {error && !data ? (
        <p className="m-auto text-sm text-destructive">Couldn’t load tasks.</p>
      ) : !data && loading ? (
        <WidgetLoader />
      ) : (
        <>
          <div>
            <span className="text-3xl font-semibold tabular-nums leading-none">{lastWeek}</span>
            <span className="ml-1.5 text-xs text-muted-foreground">done this week</span>
          </div>
          <div className="mt-auto flex h-16 items-end gap-1" aria-hidden>
            {buckets.map((b) => (
              <div
                key={b.key}
                className="flex-1 rounded-sm bg-primary/60"
                style={{ height: `${max > 0 ? Math.max(4, (b.count / max) * 100) : 4}%` }}
                title={`${b.key}: ${b.count}`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{buckets[0]?.label}</span>
            <span>{buckets.at(-1)?.label}</span>
          </div>
        </>
      )}
    </WidgetCard>
  );
}
