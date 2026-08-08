'use client';

import { useTranslations } from 'next-intl';
import { AreaChart, LegendDot, type ChartSeries } from '@midnite/ui';

import { SYSTEM_METRICS, SYSTEM_METRIC_ORDER } from '@/lib/system-metrics';
import { useSystemTelemetry } from '@/lib/use-system-telemetry';

/**
 * The landing page's bottom-left host readout — the same CPU/RAM/GPU legend and
 * area chart the screensaver corner and the dashboard widget draw, so the three
 * agree on colour and wording (all three read `SYSTEM_METRICS`).
 *
 * Renders nothing at all when the gateway can't report host metrics: the landing
 * is a calm surface, so an "unavailable" placeholder in the corner would be more
 * noise than the reading is worth. A metric the host can't measure (GPU on most
 * machines) is dropped from both the legend and the chart rather than plotted as
 * a flat zero — see `useSystemTelemetry`.
 */
export function LandingSystemMonitor() {
  const t = useTranslations('dashboard');
  const { cpu, ram, gpu, cpuNow, ramNow, gpuNow, available } = useSystemTelemetry();

  if (!available) return null;

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
    <div className="absolute bottom-6 left-6 z-10 hidden text-left sm:block">
      <div className="mb-2 flex items-center gap-4 text-xs">
        {present.map((m) => (
          <LegendDot
            key={m}
            hueVar={SYSTEM_METRICS[m].hueVar}
            label={t(SYSTEM_METRICS[m].labelKey)}
            value={values[m]!.now ?? 0}
          />
        ))}
      </div>
      <AreaChart series={series} />
    </div>
  );
}
