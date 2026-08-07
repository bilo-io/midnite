'use client';

import { useTranslations } from 'next-intl';
import { Cpu } from 'lucide-react';
import { AreaChart, LegendDot, type ChartSeries } from '@midnite/ui';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { SYSTEM_METRICS, SYSTEM_METRIC_ORDER } from '@/lib/system-metrics';
import { useSystemTelemetry } from '@/lib/use-system-telemetry';
import { WidgetCard } from './widget-card';

/**
 * Dashboard counterpart to the screensaver's bottom-left CPU/RAM/GPU readout — the
 * same area chart and legend, driven by the shared real host-telemetry hook
 * (`GET /system/stats`).
 *
 * GPU joins the chart only on hosts that can report it; elsewhere this stays the
 * two-series CPU/RAM chart it has always been, rather than plotting a flat zero
 * for a measurement that was never taken.
 */
export function SystemMonitorWidget() {
  const t = useTranslations('dashboard');
  const widgetLabels = useWidgetLabels();
  const { cpu, ram, gpu, cpuNow, ramNow, gpuNow, available } = useSystemTelemetry();

  const values: Record<string, { data: number[] | null; now: number | null }> = {
    cpu: { data: cpu, now: cpuNow },
    ram: { data: ram, now: ramNow },
    gpu: { data: gpu, now: gpuNow },
  };
  const present = SYSTEM_METRIC_ORDER.filter((m) => values[m]?.data !== null);
  const series: ChartSeries[] = present.map((m) => ({
    data: values[m]!.data as number[],
    hueVar: SYSTEM_METRICS[m].hueVar,
  }));

  return (
    <WidgetCard title={widgetLabels.label('system-monitor')} icon={Cpu}>
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        {available ? (
          <>
            <div className="flex items-center gap-4 text-xs">
              {present.map((m) => (
                <LegendDot
                  key={m}
                  hueVar={SYSTEM_METRICS[m].hueVar}
                  label={t(SYSTEM_METRICS[m].labelKey)}
                  value={values[m]!.now ?? 0}
                />
              ))}
            </div>
            <AreaChart series={series} className="h-auto w-full max-w-[260px]" />
          </>
        ) : (
          <p className="px-2 text-center text-sm text-muted-foreground">{t('systemMonitor.unavailable')}</p>
        )}
      </div>
    </WidgetCard>
  );
}
