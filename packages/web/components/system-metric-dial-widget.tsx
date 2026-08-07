'use client';

import { useTranslations } from 'next-intl';
import { MetricDial } from '@midnite/ui';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { SYSTEM_METRICS } from '@/lib/system-metrics';
import { useSystemStats } from '@/lib/use-system-stats';
import { useUnitFormat } from '@/lib/use-unit-format';
import type { SystemMetric } from '@/lib/use-system-telemetry';
import type { WidgetType } from '@/lib/dashboard-widgets';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

/**
 * The dial counterpart to {@link SystemMetricWidget} — the same three metrics as
 * a ring gauge instead of a rolling chart, matching how the Disk and App-cache
 * widgets read. Centre shows the percentage, the label underneath names the
 * metric, and the sublabel carries whatever supporting figure that metric has.
 *
 * This reads `useSystemStats` directly rather than the telemetry hook: a dial
 * shows the instant, not the history, so it has no use for the rolling series.
 * Both sit on the same TanStack Query key, so mounting dials and charts together
 * still polls the host once.
 */
export function SystemMetricDialWidget({
  metric,
  widget,
}: {
  metric: SystemMetric;
  widget: WidgetType;
}) {
  const t = useTranslations('dashboard');
  const widgetLabels = useWidgetLabels();
  const { bytes } = useUnitFormat();
  const { stats, loading, error } = useSystemStats();
  const spec = SYSTEM_METRICS[metric];

  const reading = ((): { pct: number; sublabel?: string } | null => {
    if (!stats) return null;
    if (metric === 'cpu') {
      return {
        pct: stats.cpu.usagePct,
        sublabel: t('systemMonitor.cores', { count: stats.cpu.cores }),
      };
    }
    if (metric === 'ram') {
      return {
        pct: stats.memory.usagePct,
        sublabel: t('systemMonitor.memoryOf', {
          used: bytes(stats.memory.usedBytes),
          total: bytes(stats.memory.totalBytes),
        }),
      };
    }
    // GPU: absent entirely on hosts we can't measure — see SystemStatsSchema.gpu.
    if (!stats.gpu) return null;
    return { pct: stats.gpu.usagePct, sublabel: stats.gpu.name ?? undefined };
  })();

  return (
    <WidgetCard
      title={widgetLabels.label(widget)}
      icon={spec.icon}
      bodyClassName="flex flex-col items-center justify-center gap-3 p-4"
    >
      {loading ? (
        <WidgetLoader />
      ) : error || !reading ? (
        <p className="px-2 text-center text-sm text-muted-foreground">
          {metric === 'gpu' && stats
            ? t('systemMonitor.gpuUnavailable')
            : t('systemMonitor.unavailable')}
        </p>
      ) : (
        <MetricDial
          pct={reading.pct}
          label={t(spec.labelKey)}
          hueVar={spec.hueVar}
          sublabel={reading.sublabel}
        />
      )}
    </WidgetCard>
  );
}
