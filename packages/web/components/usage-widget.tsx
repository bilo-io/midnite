'use client';

import { AlertTriangle, RefreshCw, Wallet } from 'lucide-react';
import {
  LLM_FEATURE_LABEL,
  LLM_PROVIDER_LABEL,
  type LlmFeature,
  type LlmProvider,
  type UsageBucket,
} from '@midnite/shared';
import { getUsageSummary } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;
const WINDOW_DAYS = 30;

/** ISO start-of-day `WINDOW_DAYS` ago — the summary window's lower bound. */
function windowFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - (WINDOW_DAYS - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtUsd(n: number): string {
  // Sub-cent spend still reads as "$0.00" rather than rounding away to nothing.
  return n > 0 && n < 0.01 ? '<$0.01' : `$${n.toFixed(2)}`;
}

function labelFor(key: string, axis: 'provider' | 'feature'): string {
  if (axis === 'provider') return LLM_PROVIDER_LABEL[key as LlmProvider] ?? key;
  return LLM_FEATURE_LABEL[key as LlmFeature] ?? key;
}

export function UsageWidget() {
  const { data, error, loading, refresh } = usePolling(
    () => getUsageSummary({ from: windowFrom(), groupBy: 'day' }),
    REFRESH_MS,
  );

  const maxDay = data ? data.byDay.reduce((m, b) => Math.max(m, b.estCostUsd), 0) : 0;

  return (
    <WidgetCard
      title="LLM cost & usage"
      icon={Wallet}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh usage"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="flex flex-col gap-3 overflow-y-auto p-4"
    >
      {error && !data ? (
        <p className="m-auto text-sm text-destructive">Couldn’t load usage.</p>
      ) : !data && loading ? (
        <p className="m-auto text-sm text-muted-foreground">Loading…</p>
      ) : !data ? null : (
        <>
          {data.warnings.map((w) => (
            <div
              key={w.period}
              className={cn(
                'flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs',
                w.exceeded
                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
              )}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{w.message}</span>
            </div>
          ))}

          <div>
            <span className="text-3xl font-semibold tabular-nums leading-none">
              {fmtUsd(data.totals.estCostUsd)}
            </span>
            <span className="ml-1.5 text-xs text-muted-foreground">
              est. over {WINDOW_DAYS}d · {data.totals.calls} call{data.totals.calls === 1 ? '' : 's'}
            </span>
          </div>

          {data.byDay.length > 0 && (
            <div>
              <div className="flex h-12 items-end gap-0.5" aria-hidden>
                {data.byDay.map((b) => (
                  <div
                    key={b.key}
                    className="flex-1 rounded-sm bg-primary/60"
                    style={{ height: `${maxDay > 0 ? Math.max(4, (b.estCostUsd / maxDay) * 100) : 4}%` }}
                    title={`${b.key}: ${fmtUsd(b.estCostUsd)}`}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                <span>{data.byDay[0]?.key.slice(5)}</span>
                <span>{data.byDay.at(-1)?.key.slice(5)}</span>
              </div>
            </div>
          )}

          {data.totals.calls === 0 ? (
            <p className="text-xs text-muted-foreground">
              No LLM calls recorded yet. Spend appears here once the gateway’s AI features run.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <BreakdownList title="By provider" buckets={data.byProvider} axis="provider" />
              <BreakdownList title="By feature" buckets={data.byFeature} axis="feature" />
            </div>
          )}

          <p className="mt-auto text-[10px] text-muted-foreground">
            Costs are estimates from a static price table.
          </p>
        </>
      )}
    </WidgetCard>
  );
}

function BreakdownList({
  title,
  buckets,
  axis,
}: {
  title: string;
  buckets: UsageBucket[];
  axis: 'provider' | 'feature';
}) {
  const top = [...buckets].sort((a, b) => b.estCostUsd - a.estCostUsd).slice(0, 5);
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="flex flex-col gap-1">
        {top.length === 0 ? (
          <li className="text-xs text-muted-foreground">—</li>
        ) : (
          top.map((b) => (
            <li key={b.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{labelFor(b.key, axis)}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{fmtUsd(b.estCostUsd)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
