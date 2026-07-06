'use client';

import type { Project } from '@midnite/shared';
import { projectCompletion } from '@midnite/shared';
import { statusHueVar } from '@/components/task-columns';
import { cn } from '@/lib/utils';

type Props = {
  /** Source the numbers from a project's server-computed status breakdown … */
  project?: Pick<Project, 'taskStatusCounts' | 'taskCount'>;
  /** … or pass explicit done/total (e.g. from tasks already fetched on a page). */
  done?: number;
  total?: number;
  /** Hide the "N/M · P%" label above the bar (bar-only). */
  hideLabel?: boolean;
  className?: string;
};

/**
 * Phase 58 Theme C: a thin per-project completion bar (done / total tasks) with
 * an optional label. `total` counts every assigned task — abandoned included —
 * so the % matches `projectCompletion`. Renders nothing when the project has no
 * tasks (nothing to be "N% done" about).
 */
export function ProjectProgressBar({ project, done, total, hideLabel, className }: Props) {
  const c = project
    ? projectCompletion(project)
    : (() => {
        const t = total ?? 0;
        const d = done ?? 0;
        return { done: d, total: t, pct: t > 0 ? Math.round((d / t) * 100) : 0 };
      })();

  if (c.total === 0) return null;

  const track = (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={c.pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${c.pct}% complete (${c.done} of ${c.total} tasks done)`}
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${c.pct}%`, backgroundColor: `hsl(var(${statusHueVar('done')}))` }}
      />
    </div>
  );

  // Bar-only: put the caller's className (often display utilities like
  // `hidden md:flex`) on a plain wrapper so it isn't fighting a `flex-col` root.
  if (hideLabel) {
    return <div className={cn('items-center', className)}>{track}</div>;
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Progress</span>
        <span className="tabular-nums">
          {c.done}/{c.total} · {c.pct}%
        </span>
      </div>
      {track}
    </div>
  );
}
