import type { Status } from '@midnite/shared';
import { ALL_COLUMNS } from '@/components/task-columns';

export type StatusCount = { status: Status; label: string; hueVar: string; count: number };

/** Task-status counts for a project, in canonical column order (zeroes included). */
export function statusCounts(statusByCount: Map<Status, number>): StatusCount[] {
  return ALL_COLUMNS.map((c) => ({
    status: c.status,
    label: c.label,
    hueVar: c.hueVar,
    count: statusByCount.get(c.status) ?? 0,
  }));
}

const RADIUS = 40;
const STROKE = 6;
// Gap between segments, in viewBox units (~4px at the rendered size).
const GAP = 4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A donut chart of task statuses. Renders an even, muted ring when there are no
 * tasks so the card still reads as "a project, just empty".
 */
export function StatusDonut({
  counts,
  total,
  size = 92,
}: {
  counts: StatusCount[];
  total: number;
  size?: number;
}) {
  const segments = counts.filter((c) => c.count > 0);

  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${total} tasks by status`}>
        <g transform="rotate(-90 50 50)">
          {total === 0 ? (
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={STROKE}
            />
          ) : (
            segments.map((seg) => {
              const len = (seg.count / total) * CIRCUMFERENCE;
              // Trim each arc by a gap so neighbours don't touch. With a single
              // segment there is no neighbour, so draw it whole.
              const visible = segments.length > 1 ? Math.max(len - GAP, 0.01) : len;
              const dash = `${visible} ${CIRCUMFERENCE - visible}`;
              const node = (
                <circle
                  key={seg.status}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={`hsl(var(${seg.hueVar}))`}
                  strokeWidth={STROKE}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                >
                  <title>{`${seg.label}: ${seg.count}`}</title>
                </circle>
              );
              offset += len;
              return node;
            })
          )}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold leading-none tabular-nums">{total}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {total === 1 ? 'task' : 'tasks'}
        </span>
      </div>
    </div>
  );
}
