'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CycleTimeGroupBy, CycleTimeResponse, GaugeHistoryResponse } from '@midnite/shared';
import { getCycleTime, getGaugeHistory } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { SectionCard } from './ops-view';

// ── Window control ─────────────────────────────────────────────────────────────

const WINDOWS = [7, 30, 90] as const;
type WindowDays = (typeof WINDOWS)[number];

/** ISO timestamp `days` ago at local midnight — the lower bound for gauge history. */
function windowFrom(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Human-readable duration from milliseconds (e.g. `2.5h`, `3m`, `12s`, `—`). */
export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  const s = ms / 1_000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`;
  const m = s / 60;
  if (m < 60) return `${m < 10 ? m.toFixed(1) : Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '4px 8px',
} as const;

const GROUP_BY_LABEL: Record<CycleTimeGroupBy, string> = {
  none: 'Fleet',
  repo: 'By repo',
  project: 'By project',
  priority: 'By priority',
};

// ── Cycle-time section ──────────────────────────────────────────────────────────

/** Bars for `groupBy=none`: one row per lifecycle segment, p50 + p90. */
function fleetSegments(data: CycleTimeResponse) {
  const g = data.groups[0];
  if (!g) return [];
  return [
    { label: 'Wait', p50: g.wait.p50Ms, p90: g.wait.p90Ms },
    { label: 'Work', p50: g.work.p50Ms, p90: g.work.p90Ms },
    { label: 'End-to-end', p50: g.endToEnd.p50Ms, p90: g.endToEnd.p90Ms },
  ];
}

/** Bars for a grouped query: end-to-end p50/p90 per group. */
function groupedRows(data: CycleTimeResponse) {
  return data.groups.map((g) => ({
    label: g.key,
    p50: g.endToEnd.p50Ms,
    p90: g.endToEnd.p90Ms,
  }));
}

export function CycleTimeSection({
  data,
  loading,
  groupBy,
  onGroupByChange,
}: {
  data: CycleTimeResponse | null;
  loading: boolean;
  groupBy: CycleTimeGroupBy;
  onGroupByChange: (g: CycleTimeGroupBy) => void;
}) {
  const rows = useMemo(() => {
    if (!data) return [];
    return groupBy === 'none' ? fleetSegments(data) : groupedRows(data);
  }, [data, groupBy]);

  const totalTasks = data?.groups.reduce((s, g) => s + g.taskCount, 0) ?? 0;
  const retryMs = data?.groups.reduce((s, g) => s + g.retryOverheadMsTotal, 0) ?? 0;
  const retryTasks = data?.groups.reduce((s, g) => s + g.tasksWithRetries, 0) ?? 0;
  const empty = !loading && totalTasks === 0;

  const selector = (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="sr-only">Group cycle-time by</span>
      <select
        aria-label="Group cycle-time by"
        value={groupBy}
        onChange={(e) => onGroupByChange(e.target.value as CycleTimeGroupBy)}
        className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
      >
        {(Object.keys(GROUP_BY_LABEL) as CycleTimeGroupBy[]).map((k) => (
          <option key={k} value={k}>
            {GROUP_BY_LABEL[k]}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <SectionCard
      title="Cycle time (wait vs. work)"
      action={selector}
      loading={loading && !data}
      empty={empty}
    >
      <div className="h-56 w-full min-w-0" aria-label="Cycle-time chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              width={44}
              tickFormatter={(v: number) => formatDuration(v)}
            />
            <Tooltip
              isAnimationActive={false}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number | string, name: string) => [formatDuration(Number(v)), name]}
            />
            <Bar dataKey="p50" name="p50" fill="hsl(217 91% 60%)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="p90" name="p90" fill="hsl(45 93% 58%)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{totalTasks}</span> completed task
          {totalTasks === 1 ? '' : 's'} in window
        </span>
        {retryTasks > 0 && (
          <span>
            Retry overhead:{' '}
            <span className="font-medium text-foreground">{formatDuration(retryMs)}</span> across{' '}
            {retryTasks} task{retryTasks === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </SectionCard>
  );
}

// ── Fleet-trend section ─────────────────────────────────────────────────────────

function timeTick(iso: string): string {
  const d = new Date(iso);
  // MM-DD HH:MM, trimmed to what fits: show HH:MM (intraday granularity typical).
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function MiniChart({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs text-muted-foreground">{title}</p>
      {/* min-w-0 lets ResponsiveContainer shrink inside a grid/flex track —
          without it the chart keeps its measured width and overflows on mobile. */}
      <div className="h-32 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function FleetTrendSection({
  data,
  loading,
}: {
  data: GaugeHistoryResponse | null;
  loading: boolean;
}) {
  const samples = data?.samples ?? [];
  const empty = !loading && samples.length === 0;

  const commonX = {
    dataKey: 'at',
    tick: { fontSize: 10, fill: 'var(--muted-foreground)' },
    tickLine: false,
    tickFormatter: timeTick,
    minTickGap: 32,
  } as const;
  const commonY = {
    tick: { fontSize: 10, fill: 'var(--muted-foreground)' },
    tickLine: false,
    width: 32,
  } as const;

  return (
    <SectionCard
      title="Fleet trends"
      action={
        data?.truncated ? (
          <span className="text-[10px] text-muted-foreground">showing recent samples</span>
        ) : undefined
      }
      loading={loading && !data}
      empty={empty}
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <MiniChart title="Queue depth">
          <AreaChart data={samples} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="fleet-queue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis {...commonX} />
            <YAxis {...commonY} allowDecimals={false} />
            <Tooltip isAnimationActive={false} contentStyle={TOOLTIP_STYLE} labelFormatter={timeTick} />
            <Area
              type="monotone"
              dataKey="queueDepth"
              name="queue"
              stroke="hsl(217 91% 60%)"
              strokeWidth={2}
              fill="url(#fleet-queue)"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        </MiniChart>

        <MiniChart title="Slots used / total">
          <LineChart data={samples} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis {...commonX} />
            <YAxis {...commonY} allowDecimals={false} />
            <Tooltip isAnimationActive={false} contentStyle={TOOLTIP_STYLE} labelFormatter={timeTick} />
            <Line
              type="monotone"
              dataKey="slotsTotal"
              name="total"
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="slotsUsed"
              name="used"
              stroke="hsl(160 84% 39%)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </MiniChart>

        <MiniChart title="Tick latency (ms)">
          <LineChart data={samples} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis {...commonX} />
            <YAxis {...commonY} />
            <Tooltip isAnimationActive={false} contentStyle={TOOLTIP_STYLE} labelFormatter={timeTick} />
            <Line
              type="monotone"
              dataKey="tickLatencyMs"
              name="latency"
              stroke="hsl(45 93% 58%)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </MiniChart>
      </div>
    </SectionCard>
  );
}

// ── Panel (self-fetching, window + groupBy owner) ────────────────────────────────

const CYCLE_POLL_MS = 60_000;
const GAUGE_POLL_MS = 10_000;

export function CycleFleetPanel() {
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const [groupBy, setGroupBy] = useState<CycleTimeGroupBy>('none');

  const { data: cycle, loading: cycleLoading } = usePolling<CycleTimeResponse>(
    () => getCycleTime({ groupBy, windowDays }),
    CYCLE_POLL_MS,
    [groupBy, windowDays],
  );
  const { data: gauges, loading: gaugesLoading } = usePolling<GaugeHistoryResponse>(
    () => getGaugeHistory({ from: windowFrom(windowDays) }),
    GAUGE_POLL_MS,
    [windowDays],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-1 rounded-lg border p-1 text-xs" role="group" aria-label="Time window">
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
      <CycleTimeSection
        data={cycle}
        loading={cycleLoading}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />
      <FleetTrendSection data={gauges} loading={gaugesLoading} />
    </div>
  );
}
