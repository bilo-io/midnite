// Radial gauge geometry. `SIZE` is the SVG viewport; the ring is inset by half
// the stroke so the round caps never clip. Matched to the lock screen's
// telemetry rings (and to `MetricDial`) so every ring reads at the same scale.
const SIZE = 64;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Human-readable byte size: 1-decimal below 100, whole numbers above (e.g. "42 GB", "1.4 TB"). */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 || value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/**
 * A used/total byte gauge: a radial ring filled to the used fraction (accent
 * colour) with the used/total figures in the middle and a "N% used · M free"
 * footer. Shared by the App-cache (browser quota) and Disk (host filesystem)
 * dashboard widgets so they read identically.
 */
/**
 * Copy overrides for the gauge's rendered strings — all optional, defaulting
 * to the current English so non-i18n consumers are unaffected.
 *
 * `bytes` is the odd one out: it overrides the *number* formatting rather than a
 * phrase. The gauge renders three byte figures itself (used, total, free), and the
 * built-in {@link formatBytes} pins both the unit suffix (`GB`) and the decimal
 * separator to English — so a translated consumer could localise every phrase around
 * the figures and still show `42.0 GB` on a French dashboard. Pass a locale-aware
 * formatter to fix that; the phrase overrides still receive an already-formatted string.
 */
export type RadialGaugeLabels = {
  /** SVG accessible name (default `${pct}% used`). */
  aria?: (pct: number) => string;
  /** Centre sub-line under the used figure (default `of ${total}`). */
  of?: (total: string) => string;
  /** Footer used phrase (default `${pct}% used`). */
  used?: (pct: number) => string;
  /** Footer free phrase (default `${free} free`). */
  free?: (free: string) => string;
  /** Byte-figure formatter (default {@link formatBytes} — English units, `.` decimals). */
  bytes?: (bytes: number) => string;
};

export function RadialGauge({
  usedBytes,
  totalBytes,
  labels,
}: {
  usedBytes: number;
  totalBytes: number;
  labels?: RadialGaugeLabels;
}) {
  const fraction = totalBytes > 0 ? Math.min(usedBytes / totalBytes, 1) : 0;
  const pct = Math.round(fraction * 100);
  const free = Math.max(totalBytes - usedBytes, 0);
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  const fmtBytes = labels?.bytes ?? formatBytes;

  return (
    <>
      <div className="relative flex items-center justify-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={labels?.aria ? labels.aria(pct) : `${pct}% used`}
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
        {/* Both centre lines are sized to clear the 52px inner circle at the
            widest byte figure the formatter emits (e.g. "42.0 GB"). */}
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
          <span className="text-[10px] font-semibold tabular-nums">{fmtBytes(usedBytes)}</span>
          <span className="text-[8px] tabular-nums text-muted-foreground">
            {labels?.of ? labels.of(fmtBytes(totalBytes)) : `of ${fmtBytes(totalBytes)}`}
          </span>
        </div>
      </div>
      <div className="text-center text-[11px] text-muted-foreground">
        <span className="tabular-nums">{labels?.used ? labels.used(pct) : `${pct}% used`}</span>
        <span aria-hidden> · </span>
        <span className="tabular-nums">
          {labels?.free ? labels.free(fmtBytes(free)) : `${fmtBytes(free)} free`}
        </span>
      </div>
    </>
  );
}
