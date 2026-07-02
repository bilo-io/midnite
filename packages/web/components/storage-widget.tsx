'use client';

import { useCallback, useEffect, useState } from 'react';
import { HardDrive, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

type Estimate = { usage: number; quota: number };
// `null` while the first estimate resolves; the string states are terminal.
type State = Estimate | 'unsupported' | 'error' | null;

// Radial gauge geometry. `SIZE` is the SVG viewport; the ring is inset by half
// the stroke so the round caps never clip.
const SIZE = 128;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Human-readable byte size: 1-decimal below 100, whole numbers above. */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 || value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/**
 * Shows how much of the device's storage this app is using, as a radial gauge
 * with the used/total figures in the middle. The fill uses the appearance
 * accent (`--primary`). Reads the browser Storage Manager estimate — the origin's
 * quota, which browsers derive from free disk space; it's the closest a web app
 * gets to device storage without a native bridge.
 */
export function StorageWidget() {
  const [state, setState] = useState<State>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      setState('unsupported');
      return;
    }
    setLoading(true);
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      setState({ usage, quota });
    } catch {
      setState('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <WidgetCard
      title="Storage"
      icon={HardDrive}
      actions={
        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="Refresh storage estimate"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="flex flex-col items-center justify-center gap-3 p-4"
    >
      {state === null ? (
        <WidgetLoader />
      ) : state === 'unsupported' ? (
        <p className="px-2 text-center text-sm text-muted-foreground">
          Storage estimates aren’t available in this browser.
        </p>
      ) : state === 'error' ? (
        <p className="px-2 text-center text-sm text-destructive">Couldn’t read storage.</p>
      ) : (
        <StorageGauge usage={state.usage} quota={state.quota} />
      )}
    </WidgetCard>
  );
}

function StorageGauge({ usage, quota }: Estimate) {
  const fraction = quota > 0 ? Math.min(usage / quota, 1) : 0;
  const pct = Math.round(fraction * 100);
  const free = Math.max(quota - usage, 0);
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  return (
    <>
      <div className="relative flex items-center justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${pct}% of storage used`}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            style={{ stroke: 'hsl(var(--muted))' }}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={{ stroke: 'hsl(var(--primary))', transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold tabular-nums">{formatBytes(usage)}</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">of {formatBytes(quota)}</span>
        </div>
      </div>
      <div className="text-center text-[11px] text-muted-foreground">
        <span className="tabular-nums">{pct}% used</span>
        <span aria-hidden> · </span>
        <span className="tabular-nums">{formatBytes(free)} free</span>
      </div>
    </>
  );
}
