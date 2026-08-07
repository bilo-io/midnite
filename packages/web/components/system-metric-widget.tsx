'use client';

import { useTranslations } from 'next-intl';
import { AreaChart, LegendDot, type ChartSeries } from '@midnite/ui';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { SYSTEM_METRICS } from '@/lib/system-metrics';
import { useSystemTelemetry, type SystemMetric } from '@/lib/use-system-telemetry';
import type { WidgetType } from '@/lib/dashboard-widgets';
import { WidgetCard } from './widget-card';

/**
 * A single-metric rolling area chart — the CPU, RAM and GPU dashboard widgets are
 * all this component with a different `metric`, rather than three near-identical
 * files. Shares the telemetry hook (and therefore the poll) with the combined
 * System-monitor widget and the screensaver readout.
 *
 * GPU is the only one that can be unavailable: hosts with no unprivileged GPU
 * interface report no series at all, and this says so rather than drawing a flat
 * line at zero.
 */
export function SystemMetricWidget({ metric, widget }: { metric: SystemMetric; widget: WidgetType }) {
  const t = useTranslations('dashboard');
  const widgetLabels = useWidgetLabels();
  const telemetry = useSystemTelemetry();
  const spec = SYSTEM_METRICS[metric];

  const data = telemetry[metric];
  const now = metric === 'gpu' ? telemetry.gpuNow : metric === 'cpu' ? telemetry.cpuNow : telemetry.ramNow;
  const series: ChartSeries[] = data ? [{ data, hueVar: spec.hueVar }] : [];

  return (
    <WidgetCard title={widgetLabels.label(widget)} icon={spec.icon}>
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        {telemetry.available && data && now !== null ? (
          <>
            <div className="flex items-center gap-4 text-xs">
              <LegendDot hueVar={spec.hueVar} label={t(spec.labelKey)} value={now} />
            </div>
            <AreaChart series={series} className="h-auto w-full max-w-[260px]" />
            {metric === 'gpu' && telemetry.gpuName ? (
              <span
                className="max-w-full truncate text-[11px] text-muted-foreground"
                title={telemetry.gpuName}
              >
                {telemetry.gpuName}
              </span>
            ) : null}
          </>
        ) : (
          <p className="px-2 text-center text-sm text-muted-foreground">
            {metric === 'gpu' && telemetry.available
              ? t('systemMonitor.gpuUnavailable')
              : t('systemMonitor.unavailable')}
          </p>
        )}
      </div>
    </WidgetCard>
  );
}
