'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  MetricsRollupResponse,
  UsageAttributionGroupBy,
  UsageAttributionResponse,
} from '@midnite/shared';
import { getMetricsRollups, getUsageAttribution } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { SectionCard } from './ops-view';

// ── Shared bits ─────────────────────────────────────────────────────────────────

const WINDOWS = [7, 30, 90] as const;
type WindowDays = (typeof WINDOWS)[number];

/** Grouping for the breakdown chart. `repo`/`project` read the attribution
 *  endpoint (honest measured/estimated split); `provider` derives from rollups
 *  (attribution has no provider dimension). */
type CostGroupBy = 'repo' | 'project' | 'provider';

const GROUP_BY_LABEL: Record<CostGroupBy, string> = {
  repo: 'By repo',
  project: 'By project',
  provider: 'By provider',
};

/** ISO timestamp `days` ago at local midnight — the window lower bound. */
function windowFrom(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtUsd(n: number): string {
  if (n <= 0) return '$0';
  if (n < 0.01) return '<$0.01';
  return `$${n.toFixed(2)}`;
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '4px 8px',
} as const;

// Colour vocabulary — one hue per honesty class, reused across both charts.
const LLM_COLOR = 'hsl(258 90% 66%)'; // gateway's own LLM calls (violet, matches SpendSection)
const MEASURED_COLOR = 'hsl(217 91% 60%)'; // harvested agent-session cost (blue)
const ESTIMATED_COLOR = 'hsl(45 93% 58%)'; // un-harvested session estimate (amber — 0 today)

const COST_POLL_MS = 60_000;

// ── Trend section (cost over time, from rollups) ─────────────────────────────────

type TrendRow = { date: string; llm: number; measured: number; estimated: number };

/** Fold daily rollup rows into a per-day cost stack: gateway-LLM (`source=llm`)
 *  vs. measured agent-session cost (`source=session`). Estimated session cost has
 *  no rollup source (all harvested rows are measured), so that segment is 0 today
 *  — kept in the shape so the stack stays honest if an estimate is ever rolled. */
function trendRows(data: MetricsRollupResponse | null): TrendRow[] {
  if (!data) return [];
  const byDay = new Map<string, TrendRow>();
  for (const r of data.rows) {
    const date = r.bucketStart.slice(0, 10);
    const row = byDay.get(date) ?? { date, llm: 0, measured: 0, estimated: 0 };
    const cost = r.estCostUsd ?? 0;
    if (r.source === 'llm') row.llm += cost;
    else if (r.source === 'session') row.measured += cost;
    byDay.set(date, row);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function dayTick(iso: string): string {
  return iso.slice(5); // MM-DD
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

export function CostTrendSection({
  data,
  loading,
}: {
  data: MetricsRollupResponse | null;
  loading: boolean;
}) {
  const rows = useMemo(() => trendRows(data), [data]);
  const total = rows.reduce((s, r) => s + r.llm + r.measured + r.estimated, 0);
  const empty = !loading && total === 0;

  return (
    <SectionCard
      title="Cost over time"
      action={
        !empty ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            <span className="font-medium text-foreground">{fmtUsd(total)}</span> in window
          </span>
        ) : undefined
      }
      loading={loading && !data}
      empty={empty}
    >
      <div className="h-56 w-full min-w-0" aria-label="Cost over time chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              tickFormatter={dayTick}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => fmtUsd(v)}
            />
            <Tooltip
              isAnimationActive={false}
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={dayTick}
              formatter={(v: number | string, name: string) => [fmtUsd(Number(v)), name]}
            />
            <Area
              type="monotone"
              dataKey="llm"
              name="Gateway LLM"
              stackId="cost"
              stroke={LLM_COLOR}
              fill={LLM_COLOR}
              fillOpacity={0.5}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="measured"
              name="Session (measured)"
              stackId="cost"
              stroke={MEASURED_COLOR}
              fill={MEASURED_COLOR}
              fillOpacity={0.5}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="estimated"
              name="Session (estimated)"
              stackId="cost"
              stroke={ESTIMATED_COLOR}
              fill={ESTIMATED_COLOR}
              fillOpacity={0.5}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Swatch color={LLM_COLOR} label="Gateway LLM" />
        <Swatch color={MEASURED_COLOR} label="Session (measured)" />
        <Swatch color={ESTIMATED_COLOR} label="Session (estimated)" />
      </div>
    </SectionCard>
  );
}

// ── Breakdown section (cost by dimension) ────────────────────────────────────────

const MAX_BARS = 8;

type BreakdownRow = { label: string; measured: number; estimated: number; unpriced: number };

/** Rows for the breakdown chart. repo/project come from the attribution endpoint
 *  (measured/estimated split preserved); provider is aggregated from rollup cost
 *  by `provider` (single priced figure — no split available). Both truncate to the
 *  top `MAX_BARS` by cost. */
function breakdownRows(
  groupBy: CostGroupBy,
  attribution: UsageAttributionResponse | null,
  rollups: MetricsRollupResponse | null,
): BreakdownRow[] {
  if (groupBy === 'provider') {
    const byProvider = new Map<string, number>();
    for (const r of rollups?.rows ?? []) {
      if (!r.provider) continue;
      byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + (r.estCostUsd ?? 0));
    }
    return [...byProvider.entries()]
      .map(([label, cost]) => ({ label, measured: cost, estimated: 0, unpriced: 0 }))
      .sort((a, b) => b.measured - a.measured)
      .filter((r) => r.measured > 0)
      .slice(0, MAX_BARS);
  }
  return (attribution?.buckets ?? [])
    .map((b) => ({
      label: b.label ?? b.key,
      measured: b.measuredCostUsd,
      estimated: b.estimatedCostUsd,
      unpriced: b.unpricedSessions,
    }))
    .slice(0, MAX_BARS);
}

export function CostBreakdownSection({
  groupBy,
  onGroupByChange,
  attribution,
  rollups,
  loading,
}: {
  groupBy: CostGroupBy;
  onGroupByChange: (g: CostGroupBy) => void;
  attribution: UsageAttributionResponse | null;
  rollups: MetricsRollupResponse | null;
  loading: boolean;
}) {
  const rows = useMemo(
    () => breakdownRows(groupBy, attribution, rollups),
    [groupBy, attribution, rollups],
  );
  const empty = !loading && rows.length === 0;
  const unpriced = rows.reduce((s, r) => s + r.unpriced, 0);

  const selector = (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="sr-only">Group cost by</span>
      <select
        aria-label="Group cost by"
        value={groupBy}
        onChange={(e) => onGroupByChange(e.target.value as CostGroupBy)}
        className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
      >
        {(Object.keys(GROUP_BY_LABEL) as CostGroupBy[]).map((k) => (
          <option key={k} value={k}>
            {GROUP_BY_LABEL[k]}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <SectionCard title="Cost by dimension" action={selector} loading={loading && !attribution && !rollups} empty={empty}>
      <div className="h-56 w-full min-w-0" aria-label="Cost by dimension chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={48}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => fmtUsd(v)}
            />
            <Tooltip
              isAnimationActive={false}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number | string, name: string) => [fmtUsd(Number(v)), name]}
            />
            <Bar
              dataKey="measured"
              name="Measured"
              stackId="cost"
              fill={MEASURED_COLOR}
              radius={[0, 0, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="estimated"
              name="Estimated"
              stackId="cost"
              fill={ESTIMATED_COLOR}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-3">
          <Swatch color={MEASURED_COLOR} label="Measured" />
          <Swatch color={ESTIMATED_COLOR} label="Estimated" />
        </span>
        {unpriced > 0 && (
          <span>
            <span className="font-medium text-foreground">{unpriced}</span> unpriced session
            {unpriced === 1 ? '' : 's'} (cost unknown)
          </span>
        )}
      </div>
    </SectionCard>
  );
}

// ── Panel (self-fetching, window + groupBy owner) ────────────────────────────────

export function CostPanel() {
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const [groupBy, setGroupBy] = useState<CostGroupBy>('repo');
  const from = windowFrom(windowDays);

  const { data: rollups, loading: rollupsLoading } = usePolling<MetricsRollupResponse>(
    () => getMetricsRollups({ period: 'daily', from }),
    COST_POLL_MS,
    [windowDays],
  );

  // repo/project read attribution; provider derives from rollups, so fall back to
  // a repo query (unused for the chart) to keep the hook call unconditional.
  const attrGroupBy: UsageAttributionGroupBy = groupBy === 'provider' ? 'repo' : groupBy;
  const { data: attribution, loading: attrLoading } = usePolling<UsageAttributionResponse>(
    () => getUsageAttribution({ groupBy: attrGroupBy, from }),
    COST_POLL_MS,
    [windowDays, attrGroupBy],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-1 rounded-lg border p-1 text-xs" role="group" aria-label="Cost time window">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={windowDays === w}
              onClick={() => setWindowDays(w)}
              className={
                windowDays === w
                  ? 'rounded-md bg-accent px-2.5 py-1 font-medium text-accent-foreground'
                  : 'rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              {w}d
            </button>
          ))}
        </div>
      </div>
      <CostTrendSection data={rollups} loading={rollupsLoading} />
      <CostBreakdownSection
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        attribution={attribution}
        rollups={rollups}
        loading={groupBy === 'provider' ? rollupsLoading : attrLoading}
      />
    </div>
  );
}
