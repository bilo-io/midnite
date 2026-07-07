import { formatBytes } from '@/lib/utils';

// Radial gauge geometry. `SIZE` is the SVG viewport; the ring is inset by half
// the stroke so the round caps never clip.
const SIZE = 128;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A used/total byte gauge: a radial ring filled to the used fraction (accent
 * colour) with the used/total figures in the middle and a "N% used · M free"
 * footer. Shared by the App-cache (browser quota) and Disk (host filesystem)
 * dashboard widgets so they read identically.
 */
export function RadialGauge({ usedBytes, totalBytes }: { usedBytes: number; totalBytes: number }) {
  const fraction = totalBytes > 0 ? Math.min(usedBytes / totalBytes, 1) : 0;
  const pct = Math.round(fraction * 100);
  const free = Math.max(totalBytes - usedBytes, 0);
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  return (
    <>
      <div className="relative flex items-center justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${pct}% used`}
        >
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
          <span className="text-base font-semibold tabular-nums">{formatBytes(usedBytes)}</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            of {formatBytes(totalBytes)}
          </span>
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
