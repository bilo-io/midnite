import { cn } from '../lib/cn';

// Shared rolling-percentage area chart, used by the screensaver corner readout,
// the System-monitor dashboard widgets and the admin usage page, so they all stay
// visually identical. Pure SVG: each series is drawn as a translucent filled area
// plus a solid line.

export const CHART_W = 184;
export const CHART_H = 52;

/** Fill opacity behind each series line — light enough that overlaps stay legible. */
const AREA_ALPHA = 0.15;

/**
 * One plotted series: values in 0–100, and the CSS custom property holding its
 * hue (e.g. `--status-wip`). Passing the *variable* rather than a colour keeps
 * the chart themeable — the series re-tint with the active theme for free.
 */
export type ChartSeries = {
  data: number[];
  hueVar: string;
};

function seriesPaths(data: number[]): { line: string; area: string } {
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * CHART_W;
    const y = CHART_H - (v / 100) * CHART_H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${pts.join(' L')}`;
  const area = `${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  return { line, area };
}

/**
 * Defaults to its intrinsic 184×52; pass `className` (e.g. `w-full`) to let it
 * scale to a container — the viewBox keeps the aspect ratio.
 *
 * Series are painted back-to-front so that `series[0]` ends up on top, matching
 * the order it reads in the legend beside the chart. All the areas are laid down
 * before any of the lines, so a line is never buried under a later series' fill.
 */
export function AreaChart({ series, className }: { series: ChartSeries[]; className?: string }) {
  const paths = series.map((s) => ({ hueVar: s.hueVar, ...seriesPaths(s.data) }));
  const backToFront = [...paths].reverse();

  return (
    <svg
      width={CHART_W}
      height={CHART_H}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      {backToFront.map((p, i) => (
        <path key={`area-${p.hueVar}-${i}`} d={p.area} fill={`hsl(var(${p.hueVar}) / ${AREA_ALPHA})`} />
      ))}
      {backToFront.map((p, i) => (
        <path
          key={`line-${p.hueVar}-${i}`}
          d={p.line}
          fill="none"
          stroke={`hsl(var(${p.hueVar}))`}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

export function LegendDot({ hueVar, label, value }: { hueVar: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ background: `hsl(var(${hueVar}))` }}
      />
      {label}
      <span className="tabular-nums text-foreground">{value}%</span>
    </span>
  );
}
