import { cn } from '@/lib/utils';

// Shared CPU/RAM area chart used by both the screensaver corner readout and the
// System monitor dashboard widget, so the two stay visually identical. Pure SVG:
// two overlapping series (CPU amber = --status-wip, RAM blue = --status-todo)
// drawn as a translucent filled area plus a solid line.

export const CHART_W = 184;
export const CHART_H = 52;

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

// Defaults to its intrinsic 184×52; pass `className` (e.g. `w-full`) to let it
// scale to a container — the viewBox keeps the aspect ratio.
export function AreaChart({
  cpu,
  ram,
  className,
}: {
  cpu: number[];
  ram: number[];
  className?: string;
}) {
  const c = seriesPaths(cpu);
  const r = seriesPaths(ram);
  return (
    <svg
      width={CHART_W}
      height={CHART_H}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      <path d={r.area} fill="hsl(var(--status-todo) / 0.14)" />
      <path d={c.area} fill="hsl(var(--status-wip) / 0.16)" />
      <path d={r.line} fill="none" stroke="hsl(var(--status-todo))" strokeWidth={1.5} />
      <path d={c.line} fill="none" stroke="hsl(var(--status-wip))" strokeWidth={1.5} />
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
