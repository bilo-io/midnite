'use client';

import { useTranslations } from 'next-intl';
import { Cpu } from 'lucide-react';
import { AreaChart, LegendDot } from '@midnite/ui';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { useSystemTelemetry } from '@/lib/use-system-telemetry';
import { WidgetCard } from './widget-card';

/**
 * Dashboard counterpart to the screensaver's bottom-left CPU/RAM readout — the same
 * area chart and legend, driven by the shared real host-telemetry hook
 * (`GET /system/stats`).
 */
export function SystemMonitorWidget() {
  const t = useTranslations('dashboard');
  const widgetLabels = useWidgetLabels();
  const { cpu, ram, cpuNow, ramNow, available } = useSystemTelemetry();
  return (
    <WidgetCard title={widgetLabels.label('system-monitor')} icon={Cpu}>
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        {available ? (
          <>
            <div className="flex items-center gap-4 text-xs">
              {/* CPU/RAM are the near-universal abbreviations, but they stay catalog keys so a
                  locale that spells them differently (e.g. `UC`/`MEV`) isn't blocked by code. */}
              <LegendDot hueVar="--status-wip" label={t('systemMonitor.cpu')} value={cpuNow} />
              <LegendDot hueVar="--status-todo" label={t('systemMonitor.ram')} value={ramNow} />
            </div>
            <AreaChart cpu={cpu} ram={ram} className="h-auto w-full max-w-[260px]" />
          </>
        ) : (
          <p className="px-2 text-center text-sm text-muted-foreground">{t('systemMonitor.unavailable')}</p>
        )}
      </div>
    </WidgetCard>
  );
}
