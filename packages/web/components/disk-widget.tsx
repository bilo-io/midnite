'use client';

import { useTranslations } from 'next-intl';
import { HardDrive } from 'lucide-react';
import { RadialGauge, type RadialGaugeLabels } from '@midnite/ui';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { useSystemStats } from '@/lib/use-system-stats';
import { useUnitFormat } from '@/lib/use-unit-format';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

/**
 * Real device storage: the capacity of the filesystem hosting the gateway,
 * polled from `GET /system/stats` (`node:fs.statfs`). Unlike the App-cache widget
 * — which shows the browser's per-origin quota — this is the actual hard drive.
 */
export function DiskWidget() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const widgetLabels = useWidgetLabels();
  const { bytes } = useUnitFormat();
  const { stats, loading, error } = useSystemStats();
  const disk = stats?.disks[0] ?? null;

  const gaugeLabels: RadialGaugeLabels = {
    aria: (pct) => tCommon('ui.gauge.pctUsed', { pct }),
    used: (pct) => tCommon('ui.gauge.pctUsed', { pct }),
    of: (total) => tCommon('ui.gauge.ofTotal', { total }),
    free: (free) => tCommon('ui.gauge.free', { free }),
    bytes,
  };

  return (
    <WidgetCard
      title={widgetLabels.label('disk')}
      icon={HardDrive}
      bodyClassName="flex flex-col items-center justify-center gap-3 p-4"
    >
      {loading ? (
        <WidgetLoader />
      ) : error || !disk ? (
        <p className="px-2 text-center text-sm text-muted-foreground">{t('disk.unavailable')}</p>
      ) : (
        <>
          <RadialGauge usedBytes={disk.usedBytes} totalBytes={disk.totalBytes} labels={gaugeLabels} />
          <span className="max-w-full truncate font-mono text-[11px] text-muted-foreground" title={disk.path}>
            {disk.path}
          </span>
        </>
      )}
    </WidgetCard>
  );
}
