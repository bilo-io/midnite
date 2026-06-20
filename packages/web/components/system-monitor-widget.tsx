'use client';

import { Cpu } from 'lucide-react';
import { useSystemTelemetry } from '@/lib/use-system-telemetry';
import { AreaChart, LegendDot } from './system-chart';
import { WidgetCard } from './widget-card';

/**
 * Dashboard counterpart to the screensaver's bottom-left CPU/RAM readout — the same
 * area chart and legend, driven by the shared simulated-telemetry hook.
 */
export function SystemMonitorWidget() {
  const { cpu, ram, cpuNow, ramNow } = useSystemTelemetry();
  return (
    <WidgetCard title="System monitor" icon={Cpu}>
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        <div className="flex items-center gap-4 text-xs">
          <LegendDot hueVar="--status-wip" label="CPU" value={cpuNow} />
          <LegendDot hueVar="--status-todo" label="RAM" value={ramNow} />
        </div>
        <AreaChart cpu={cpu} ram={ram} className="h-auto w-full max-w-[260px]" />
      </div>
    </WidgetCard>
  );
}
