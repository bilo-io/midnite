'use client';

import { HardDrive } from 'lucide-react';
import { RadialGauge } from '@midnite/ui';
import { useSystemStats } from '@/lib/use-system-stats';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

/**
 * Real device storage: the capacity of the filesystem hosting the gateway,
 * polled from `GET /system/stats` (`node:fs.statfs`). Unlike the App-cache widget
 * — which shows the browser's per-origin quota — this is the actual hard drive.
 */
export function DiskWidget() {
  const { stats, loading, error } = useSystemStats();
  const disk = stats?.disks[0] ?? null;

  return (
    <WidgetCard title="Disk" icon={HardDrive} bodyClassName="flex flex-col items-center justify-center gap-3 p-4">
      {loading ? (
        <WidgetLoader />
      ) : error || !disk ? (
        <p className="px-2 text-center text-sm text-muted-foreground">
          Disk usage is unavailable.
        </p>
      ) : (
        <>
          <RadialGauge usedBytes={disk.usedBytes} totalBytes={disk.totalBytes} />
          <span className="max-w-full truncate font-mono text-[11px] text-muted-foreground" title={disk.path}>
            {disk.path}
          </span>
        </>
      )}
    </WidgetCard>
  );
}
