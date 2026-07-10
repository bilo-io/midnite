'use client';

import { useMemo } from 'react';
import { Coins, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { UsageAttributionResponse } from '@midnite/shared';
import { getUsageAttribution } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;
const WINDOWS = [7, 30, 90] as const;
/** How many repos the compact chart shows before folding the tail away. */
const MAX_BARS = 6;

type Config = { windowDays: number };

/** ISO start-of-day `days`-1 ago — the attribution window's lower bound. */
function windowFrom(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtUsd(n: number): string {
  return n > 0 && n < 0.01 ? '<$0.01' : `$${n.toFixed(2)}`;
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '4px 8px',
} as const;

type Row = { label: string; measured: number; estimated: number };

function toRows(data: UsageAttributionResponse): Row[] {
  return data.buckets.slice(0, MAX_BARS).map((b) => ({
    label: b.label ?? b.key,
    measured: b.measuredCostUsd,
    estimated: b.estimatedCostUsd,
  }));
}

/**
 * Compact cost-by-repo widget (Phase 61 H): a horizontal stacked bar per repo,
 * measured vs. estimated spend, reading `GET /usage/attribution?groupBy=repo`.
 * Honest empty state — no zeroed chart when nothing has been harvested yet.
 */
export function CostByRepoWidget({
  config,
  onConfigChange,
}: {
  config: Config;
  onConfigChange: (c: Config) => void;
}) {
  const { data, error, loading, refresh } = usePolling(
    () => getUsageAttribution({ groupBy: 'repo', from: windowFrom(config.windowDays) }),
    REFRESH_MS,
    [config.windowDays],
  );

  const rows = useMemo(() => (data ? toRows(data) : []), [data]);

  return (
    <WidgetCard
      title="Cost by repo"
      icon={Coins}
      actions={
        <>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="sr-only">Cost window</span>
            <select
              aria-label="Cost window"
              value={config.windowDays}
              onChange={(e) => onConfigChange({ windowDays: Number(e.target.value) })}
              className="rounded-md border bg-background px-1.5 py-0.5 text-xs text-foreground"
            >
              {WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {w}d
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh cost by repo"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </button>
        </>
      }
      bodyClassName="flex flex-col gap-3 overflow-y-auto p-4"
    >
      {error && !data ? (
        <p className="m-auto text-sm text-destructive">Couldn’t load cost data.</p>
      ) : !data && loading ? (
        <p className="m-auto text-sm text-muted-foreground">Loading…</p>
      ) : !data ? null : data.buckets.length === 0 ? (
        <p className="m-auto max-w-[28ch] text-center text-sm text-muted-foreground">
          No session cost recorded yet — spend appears once agent sessions run.
        </p>
      ) : (
        <>
          <div>
            <span className="text-2xl font-semibold tabular-nums leading-none">
              {fmtUsd(data.totals.estCostUsd)}
            </span>
            <span className="ml-1.5 text-xs text-muted-foreground">
              est over {config.windowDays}d · {data.totals.sessions} session
              {data.totals.sessions === 1 ? '' : 's'}
            </span>
          </div>

          <div className="min-h-0 flex-1" role="img" aria-label="Cost by repo chart">
            <ResponsiveContainer width="100%" height="100%" minHeight={rows.length * 34 + 40}>
              <BarChart
                layout="vertical"
                data={rows}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  tickFormatter={(v: number) => fmtUsd(v)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={80}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                />
                <Tooltip
                  isAnimationActive={false}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number | string, name: string) => [fmtUsd(Number(v)), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="measured"
                  name="measured"
                  stackId="cost"
                  fill="hsl(var(--primary))"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="estimated"
                  name="estimated"
                  stackId="cost"
                  fill="hsl(var(--primary) / 0.4)"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {data.totals.unpricedSessions > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {data.totals.unpricedSessions} session
              {data.totals.unpricedSessions === 1 ? '' : 's'} on an unpriced model — cost not
              counted.
            </p>
          ) : null}
        </>
      )}
    </WidgetCard>
  );
}
