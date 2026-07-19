import type { ReactNode } from 'react';
import { Card } from '@midnite/ui';
import { cn } from '@/lib/utils';

/**
 * A single platform-KPI tile (Phase 73 Theme F): a label, a large tabular value,
 * and an optional hint/sub-line. Built on the `@midnite/ui` `Card` so it tracks
 * the appearance tokens. Generic — reused by Overview and Usage.
 */
export function KpiTile({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col gap-1 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Card>
  );
}
