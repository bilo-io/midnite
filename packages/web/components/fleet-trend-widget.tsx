'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GaugeSample } from '@midnite/shared';
import { getGaugeHistory } from '@/lib/api';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 60_000;

type Series = 'queueDepth' | 'slotsUsed' | 'tickLatencyMs';
type Config = { series: Series };

/** The series options, in select order; wording comes from `dashboard.fleetTrend.series.*`. */
const SERIES_OPTIONS: readonly Series[] = ['queueDepth', 'slotsUsed', 'tickLatencyMs'];

/** Whether a sample carries a value for the chosen series. */
function hasValue(s: GaugeSample, series: Series): boolean {
  return s[series] != null;
}

function timeTick(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '4px 8px',
} as const;

/**
 * Compact fleet-trend widget (Phase 61 H): one chosen gauge series (queue depth /
 * slots used / tick latency) over the recorded samples from
 * `GET /metrics/gauges/history`. Honest empty state while the sampler warms up.
 */
export function FleetTrendWidget({
  config,
  onConfigChange,
}: {
  config: Config;
  onConfigChange: (c: Config) => void;
}) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const widgetLabels = useWidgetLabels();
  const { data, error, loading, refresh } = usePolling(() => getGaugeHistory(), REFRESH_MS);
  const seriesLabel = t(`fleetTrend.series.${config.series}`);

  // Keep only samples that carry the chosen series (skip nulls so the line is honest).
  const points = useMemo(
    () => (data?.samples ?? []).filter((s) => hasValue(s, config.series)),
    [data, config.series],
  );

  return (
    <WidgetCard
      title={widgetLabels.label('fleet-trend')}
      icon={TrendingUp}
      actions={
        <>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="sr-only">{t('fleetTrend.seriesAria')}</span>
            <select
              aria-label={t('fleetTrend.seriesAria')}
              value={config.series}
              onChange={(e) => onConfigChange({ series: e.target.value as Series })}
              className="rounded-md border bg-background px-1.5 py-0.5 text-xs text-foreground"
            >
              {SERIES_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {t(`fleetTrend.series.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={refresh}
            aria-label={t('fleetTrend.refresh')}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </button>
        </>
      }
      bodyClassName="flex flex-col gap-2 p-4"
    >
      {error && !data ? (
        <p className="m-auto text-sm text-destructive">{t('fleetTrend.error')}</p>
      ) : !data && loading ? (
        <p className="m-auto text-sm text-muted-foreground">{tCommon('loading')}</p>
      ) : !data ? null : (data.samples.length === 0 || points.length === 0) ? (
        <p className="m-auto max-w-[28ch] text-center text-sm text-muted-foreground">
          {t('fleetTrend.empty')}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{seriesLabel}</p>
          <div className="min-h-0 flex-1" role="img" aria-label={t('fleetTrend.chartAria', { series: seriesLabel })}>
            <ResponsiveContainer width="100%" height="100%" minHeight={100}>
              <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="at"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  tickFormatter={timeTick}
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  width={32}
                  allowDecimals={config.series === 'tickLatencyMs'}
                />
                <Tooltip
                  isAnimationActive={false}
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={timeTick}
                />
                <Line
                  type="monotone"
                  dataKey={config.series}
                  name={seriesLabel}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </WidgetCard>
  );
}
