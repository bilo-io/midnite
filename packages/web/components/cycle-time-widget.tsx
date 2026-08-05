'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, Timer } from 'lucide-react';
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
import type { CycleTimeGroupBy, CycleTimeResponse } from '@midnite/shared';
import { getCycleTime } from '@/lib/api';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { usePolling } from '@/lib/use-polling';
import { useUnitFormat } from '@/lib/use-unit-format';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;
const WINDOWS = [7, 30, 90] as const;
/** How many groups the compact chart shows when grouped. */
const MAX_GROUPS = 5;

type Config = { windowDays: number; groupBy: CycleTimeGroupBy };

/** The group-by options, in select order; wording comes from `dashboard.cycleTime.groupBy.*`. */
const GROUP_BY_OPTIONS: readonly CycleTimeGroupBy[] = ['none', 'repo', 'project', 'priority'];

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '4px 8px',
} as const;

type Row = { label: string; p50: number | null; p90: number | null };

/** Segment wording for the fleet view's three bars, passed in so this stays pure. */
type SegmentLabels = { wait: string; work: string; endToEnd: string };

/** Fleet view: one row per lifecycle segment (wait/work/end-to-end). */
function fleetRows(data: CycleTimeResponse, segments: SegmentLabels): Row[] {
  const g = data.groups[0];
  if (!g) return [];
  return [
    { label: segments.wait, p50: g.wait.p50Ms, p90: g.wait.p90Ms },
    { label: segments.work, p50: g.work.p50Ms, p90: g.work.p90Ms },
    { label: segments.endToEnd, p50: g.endToEnd.p50Ms, p90: g.endToEnd.p90Ms },
  ];
}

/** Grouped view: end-to-end p50/p90 for the top groups by task count. */
function groupedRows(data: CycleTimeResponse): Row[] {
  return data.groups.slice(0, MAX_GROUPS).map((g) => ({
    label: g.key,
    p50: g.endToEnd.p50Ms,
    p90: g.endToEnd.p90Ms,
  }));
}

/**
 * Compact cycle-time widget (Phase 61 H): p50/p90 wait/work/end-to-end as grouped
 * bars, reading `GET /metrics/cycle-time`. Fleet-wide by default; a group-by select
 * pivots to per-repo/project/priority end-to-end. Honest empty state.
 */
export function CycleTimeWidget({
  config,
  onConfigChange,
}: {
  config: Config;
  onConfigChange: (c: Config) => void;
}) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const widgetLabels = useWidgetLabels();
  const { duration } = useUnitFormat();
  const { data, error, loading, refresh } = usePolling(
    () => getCycleTime({ groupBy: config.groupBy, windowDays: config.windowDays }),
    REFRESH_MS,
    [config.groupBy, config.windowDays],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    if (config.groupBy !== 'none') return groupedRows(data);
    return fleetRows(data, {
      wait: t('cycleTime.segments.wait'),
      work: t('cycleTime.segments.work'),
      endToEnd: t('cycleTime.segments.endToEnd'),
    });
  }, [data, config.groupBy, t]);

  const totalTasks = data?.groups.reduce((s, g) => s + g.taskCount, 0) ?? 0;
  const retryMs = data?.groups.reduce((s, g) => s + g.retryOverheadMsTotal, 0) ?? 0;
  const retryTasks = data?.groups.reduce((s, g) => s + g.tasksWithRetries, 0) ?? 0;

  return (
    <WidgetCard
      title={widgetLabels.label('cycle-time')}
      icon={Timer}
      actions={
        <>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="sr-only">{t('cycleTime.groupByAria')}</span>
            <select
              aria-label={t('cycleTime.groupByAria')}
              value={config.groupBy}
              onChange={(e) =>
                onConfigChange({ ...config, groupBy: e.target.value as CycleTimeGroupBy })
              }
              className="rounded-md border bg-background px-1.5 py-0.5 text-xs text-foreground"
            >
              {GROUP_BY_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {t(`cycleTime.groupBy.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="sr-only">{t('cycleTime.windowAria')}</span>
            <select
              aria-label={t('cycleTime.windowAria')}
              value={config.windowDays}
              onChange={(e) => onConfigChange({ ...config, windowDays: Number(e.target.value) })}
              className="rounded-md border bg-background px-1.5 py-0.5 text-xs text-foreground"
            >
              {WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {t('cycleTime.windowDays', { days: w })}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={refresh}
            aria-label={t('cycleTime.refresh')}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </button>
        </>
      }
      bodyClassName="flex flex-col gap-3 overflow-y-auto p-4"
    >
      {error && !data ? (
        <p className="m-auto text-sm text-destructive">{t('cycleTime.error')}</p>
      ) : !data && loading ? (
        <p className="m-auto text-sm text-muted-foreground">{tCommon('loading')}</p>
      ) : !data ? null : totalTasks === 0 || rows.length === 0 ? (
        <p className="m-auto max-w-[28ch] text-center text-sm text-muted-foreground">
          {t('cycleTime.empty')}
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1" role="img" aria-label={t('cycleTime.chartAria')}>
            <ResponsiveContainer width="100%" height="100%" minHeight={140}>
              <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v: number) => duration(v)}
                />
                <Tooltip
                  isAnimationActive={false}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number | string, name: string) => [duration(Number(v)), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="p50"
                  name={t('cycleTime.series.p50')}
                  fill="hsl(var(--primary))"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="p90"
                  name={t('cycleTime.series.p90')}
                  fill="hsl(var(--primary) / 0.4)"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t.rich('cycleTime.completedInWindow', {
                count: totalTasks,
                days: config.windowDays,
                strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })}
            </span>
            {retryTasks > 0 ? (
              <span>
                {t.rich('cycleTime.retryOverhead', {
                  duration: duration(retryMs),
                  count: retryTasks,
                  strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                })}
              </span>
            ) : null}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
