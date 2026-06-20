'use client';

import { MARKET_TIMEFRAMES, TIMEFRAME_LABELS, useGlobalTimeframe } from '@/lib/use-global-timeframe';
import { cn } from '@/lib/utils';

/**
 * The dashboard-wide market timeframe picker. One control drives every market card
 * via {@link useGlobalTimeframe}; styled like the weather widget's unit toggle.
 */
export function DashboardTimeframe() {
  const [timeframe, setTimeframe] = useGlobalTimeframe();

  return (
    <div
      role="group"
      aria-label="Market timeframe"
      className="flex items-center rounded-md border border-border/60 p-0.5 text-[10px]"
    >
      {MARKET_TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          type="button"
          onClick={() => setTimeframe(tf)}
          aria-pressed={timeframe === tf}
          className={cn(
            'rounded px-1.5 py-0.5 font-medium tabular-nums transition-colors',
            timeframe === tf ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {TIMEFRAME_LABELS[tf]}
        </button>
      ))}
    </div>
  );
}
