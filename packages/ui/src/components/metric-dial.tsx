import { cn } from '../lib/cn';

// A percentage dial: the same ring geometry as `RadialGauge`, but for a *rate*
// rather than a used/total pair. The distinction is why this is a separate
// component instead of a prop on that one — `RadialGauge` is byte-denominated
// throughout (it formats three byte figures and computes its own fraction from
// used/total), whereas a CPU/GPU load has no denominator to show and no bytes to
// format. Sharing the geometry constants keeps the two visually identical.

// Ring geometry, deliberately matched to the lock screen's telemetry rings
// (64px / 6px stroke) so a dial reads at the same scale wherever it appears.
const SIZE = 64;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A dial reading 0–100%: the ring fills to the value, the centre shows the
 * percentage, and `label` names the metric underneath (CPU / RAM / GPU).
 *
 * `hueVar` is a CSS custom property name rather than a colour so a dial and its
 * line on the combined area chart can be given the same token and stay in step
 * across themes.
 *
 * `sublabel` is optional supporting detail (an adapter name, a used/total
 * figure) — it is *not* part of the accessible name, which stays the metric and
 * its value so a screen reader gets "GPU, 74%" and not a paragraph.
 */
export function MetricDial({
  pct,
  label,
  hueVar,
  sublabel,
  ariaLabel,
  className,
}: {
  pct: number;
  label: string;
  hueVar: string;
  sublabel?: string;
  /** Accessible name; defaults to `<label> <pct>%`. */
  ariaLabel?: string;
  className?: string;
}) {
  const clamped = Math.min(Math.max(Number.isFinite(pct) ? pct : 0, 0), 100);
  const rounded = Math.round(clamped);
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);
  const stroke = `hsl(var(${hueVar}))`;

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="relative flex items-center justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={ariaLabel ?? `${label} ${rounded}%`}
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
            // Matches RadialGauge's easing so a board mixing the two doesn't
            // animate at two different speeds.
            style={{ stroke, transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold tabular-nums">{rounded}%</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {sublabel ? (
          <span className="max-w-full truncate text-[11px] text-muted-foreground" title={sublabel}>
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
