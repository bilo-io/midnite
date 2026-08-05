'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { useOpsCardTitle } from '@/lib/ops-widget-labels';
import { usePolling } from '@/lib/use-polling';
import { useUnitFormat } from '@/lib/use-unit-format';
import { SectionCard, WindowToggle } from './ops-view';

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
export 
const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '4px 8px',
} as const;

/** Group-by options in select order; wording is shared with the dashboard's cycle-time
 *  widget via `dashboard.cycleTime.groupBy.*` — one vocabulary for one concept. */
const GROUP_BY_OPTIONS: readonly CycleTimeGroupBy[] = ['none', 'repo', 'project', 'priority'];


// ── Cycle-time section ──────────────────────────────────────────────────────────

/** Segment wording, passed in so this stays pure. Shared with the dashboard widget. */
type SegmentLabels = { wait: string; work: string; endToEnd: string };

/** Bars for `groupBy=none`: one row per lifecycle segment, p50 + p90. */
function fleetSegments(data: CycleTimeResponse, segments: SegmentLabels) {
  const g = data.groups[0];
  if (!g) return [];
  return [
    { label: segments.wait, p50: g.wait.p50Ms, p90: g.wait.p90Ms },
    { label: segments.work, p50: g.work.p50Ms, p90: g.work.p90Ms },
    { label: segments.endToEnd, p50: g.endToEnd.p50Ms, p90: g.endToEnd.p90Ms },
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
  windowControl,
}: {
  data: CycleTimeResponse | null;
  loading: boolean;
  groupBy: CycleTimeGroupBy;
  onGroupByChange: (g: CycleTimeGroupBy) => void;
  windowControl?: React.ReactNode;
}) {
  const t = useTranslations('ops');
  const tDash = useTranslations('dashboard');
  const cardTitle = useOpsCardTitle();
  const { preciseDuration } = useUnitFormat();
  const rows = useMemo(() => {
    if (!data) return [];
    return groupBy === 'none'
      ? fleetSegments(data, {
          wait: tDash('cycleTime.segments.wait'),
          work: tDash('cycleTime.segments.work'),
          endToEnd: tDash('cycleTime.segments.endToEnd'),
        })
      : groupedRows(data);
  }, [data, groupBy, tDash]);

  const totalTasks = data?.groups.reduce((s, g) => s + g.taskCount, 0) ?? 0;
  const retryMs = data?.groups.reduce((s, g) => s + g.retryOverheadMsTotal, 0) ?? 0;
  const retryTasks = data?.groups.reduce((s, g) => s + g.tasksWithRetries, 0) ?? 0;
  const empty = !loading && totalTasks === 0;

  const selector = (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="sr-only">{tDash('cycleTime.groupByAria')}</span>
        <select
          aria-label={tDash('cycleTime.groupByAria')}
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as CycleTimeGroupBy)}
          className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
        >
          {GROUP_BY_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {tDash(`cycleTime.groupBy.${k}`)}
            </option>
          ))}
        </select>
      </label>
      {windowControl}
    </div>
  );

  return (
    <SectionCard
      title={cardTitle('cycle-time')}
      action={selector}
      loading={loading && !data}
      empty={empty}
    >
      <div className="h-56 w-full min-w-0" aria-label={tDash('cycleTime.chartAria')}>
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
              tickFormatter={(v: number) => preciseDuration(v)}
            />
            <Tooltip
              isAnimationActive={false}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number | string, name: string) => [preciseDuration(Number(v)), name]}
            />
            <Bar dataKey="p50" name={tDash('cycleTime.series.p50')} fill="hsl(217 91% 60%)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="p90" name={tDash('cycleTime.series.p90')} fill="hsl(45 93% 58%)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {t.rich('cycleTime.completedInWindow', {
            count: totalTasks,
            strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </span>
        {retryTasks > 0 && (
          <span>
            {t.rich('cycleTime.retryOverhead', {
              duration: preciseDuration(retryMs),
              count: retryTasks,
              strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
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
  windowControl,
}: {
  data: GaugeHistoryResponse | null;
  loading: boolean;
  windowControl?: React.ReactNode;
}) {
  const t = useTranslations('ops');
  const cardTitle = useOpsCardTitle();
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
      title={cardTitle('fleet-trend')}
      action={
        <div className="flex items-center gap-2">
          {data?.truncated && (
            <span className="text-[10px] text-muted-foreground">{t('fleetTrend.truncated')}</span>
          )}
          {windowControl}
        </div>
      }
      loading={loading && !data}
      empty={empty}
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <MiniChart title={t('fleetTrend.queueDepth')}>
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

        <MiniChart title={t('fleetTrend.slotsUsedTotal')}>
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

        <MiniChart title={t('fleetTrend.tickLatency')}>
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

// ── Panels (self-fetching, one card each — one grid cell each) ───────────────────

const CYCLE_POLL_MS = 60_000;
const GAUGE_POLL_MS = 10_000;

/** Cycle-time as its own board cell: owns its window + groupBy + cycle poll. */
export function CycleTimePanel() {
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const [groupBy, setGroupBy] = useState<CycleTimeGroupBy>('none');
  const t = useTranslations('ops');

  const { data: cycle, loading } = usePolling<CycleTimeResponse>(
    () => getCycleTime({ groupBy, windowDays }),
    CYCLE_POLL_MS,
    [groupBy, windowDays],
  );

  return (
    <CycleTimeSection
      data={cycle}
      loading={loading}
      groupBy={groupBy}
      onGroupByChange={setGroupBy}
      windowControl={
        <WindowToggle windows={WINDOWS} value={windowDays} onChange={setWindowDays} label={t('windowAria')} />
      }
    />
  );
}

/** Fleet trends as its own board cell: owns its window + gauge-history poll. */
export function FleetTrendPanel() {
  const t = useTranslations('ops');
  const [windowDays, setWindowDays] = useState<WindowDays>(30);

  const { data: gauges, loading } = usePolling<GaugeHistoryResponse>(
    () => getGaugeHistory({ from: windowFrom(windowDays) }),
    GAUGE_POLL_MS,
    [windowDays],
  );

  return (
    <FleetTrendSection
      data={gauges}
      loading={loading}
      windowControl={
        <WindowToggle windows={WINDOWS} value={windowDays} onChange={setWindowDays} label={t('windowAria')} />
      }
    />
  );
}
