import { Square } from 'lucide-react';
import type { TaskSummary } from '@midnite/shared';
import { BlockedBadge } from '@/components/blocked-badge';
import { ProjectTag } from '@/components/project-tag';
import { SelectableIcon } from '@/components/selectable-icon';
import type { ProjectTagInfo } from '@/components/task-card';
import { statusLabel, statusHueVar } from '@/components/task-columns';
import { cn } from '@/lib/utils';

const KIND_LABELS: Record<NonNullable<TaskSummary['kind']>, string> = {
  bug: 'Bugfix',
  feature: 'Feature',
  question: 'Question',
  chore: 'Chore',
  unknown: 'Task',
};
const KIND_HUE_VARS: Record<NonNullable<TaskSummary['kind']>, string> = {
  bug: '--kind-bug',
  feature: '--kind-feature',
  question: '--kind-question',
  chore: '--kind-chore',
  unknown: '--kind-unknown',
};

/**
 * A single task rendered as a compact table row, used inside the Tasks table
 * sections and the Projects tree. Clickable when `onSelect` is supplied,
 * otherwise a static row. Pass `showStatus` to trail the row with the task's
 * status (used where rows aren't already grouped by status).
 */
export function TaskRow({
  task,
  project,
  onSelect,
  showStatus = false,
  selected = false,
  onToggleSelect,
  blockedBy,
}: {
  task: TaskSummary;
  project?: ProjectTagInfo;
  onSelect?: () => void;
  showStatus?: boolean;
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
  /** Count of unmet blockers (Phase 27); shows a chip when > 0. */
  blockedBy?: number;
}) {
  const kind = task.kind ?? 'unknown';
  const interactive = Boolean(onSelect);
  const selectable = Boolean(onToggleSelect);

  // Kind badge: a fit-content coloured pill inside a fixed-width leading cell.
  // The cell (`sm:w-24`) reserves a uniform column so the title after it aligns
  // across every row and accordion group, while the pill hugs its own label — the
  // coloured block never stretches past the word. It leads the row (far left,
  // after any checkbox) via `sm:order-first`, in both the Tasks list/table and the
  // Projects tree. On mobile the cell is intrinsic and stays in the meta line, so
  // the two-line card layout is untouched.
  const kindBadge = (
    <span className="inline-flex shrink-0 items-center sm:order-first sm:w-24">
      <span
        className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
        style={{ background: 'hsl(var(--kind-hue) / 0.12)', color: 'hsl(var(--kind-hue))' }}
      >
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'hsl(var(--kind-hue))' }} />
        {KIND_LABELS[kind]}
      </span>
    </span>
  );
  // Status trails at the far right (only where rows aren't grouped by status — the
  // Projects tree). Intrinsic width; the flex-1 title pushes it to the edge.
  const statusBadge = showStatus ? (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground"
      style={{ ['--st-hue' as string]: `var(${statusHueVar(task.status)})` }}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'hsl(var(--st-hue))' }} />
      {statusLabel(task.status)}
    </span>
  ) : null;

  // On mobile (< sm): two-line card layout — title on line 1, kind + meta on line 2.
  // On sm+: single-line row layout, with the leading badge pulled far-left.
  const body = (
    <>
      {/* Line 1: title (always full-width on mobile) */}
      <span className="min-w-0 truncate text-sm font-medium sm:flex-1">{task.title}</span>
      {/* Line 2 on mobile / inline chips on sm+: kind + project + status + blocked */}
      <span className="flex shrink-0 flex-wrap items-center gap-1.5 sm:contents">
        {kindBadge}
        {task.repo && (
          <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:inline">{task.repo}</span>
        )}
        {project && <ProjectTag tag={project.tag} color={project.color} className="shrink-0" />}
        {(blockedBy ?? 0) > 0 ? <BlockedBadge count={blockedBy ?? 0} /> : null}
        {statusBadge}
      </span>
    </>
  );

  // Base row: flex-col (two-line card) on mobile, single-line row on sm+.
  // Executing (an agent is actively running it) — the signature rotating,
  // pulsating gradient frame, shared across every task view. Waiting (parked
  // for input/approval) gets a gentler, orange-toned cousin.
  const isRunning = task.status === 'wip';
  const isWaiting = task.status === 'waiting';
  const rowBase = cn(
    'flex w-full flex-col gap-1 border-b border-border/40 px-3 py-2.5 text-left last:border-b-0',
    'sm:flex-row sm:items-center sm:gap-3 sm:py-2',
    (interactive || selectable) && 'hover:bg-accent/40',
    selected && 'bg-accent/30',
    isRunning && 'task-running',
    isWaiting && 'task-waiting',
  );
  const style = { ['--kind-hue' as string]: `var(${KIND_HUE_VARS[kind]})` };

  // Selectable rows can't be a single <button> (the SelectableIcon is itself a
  // button) — split into a select cell plus a clickable body. The outer wrapper
  // stays flex-row always so the icon anchors left; the inner button carries the
  // two-line layout so it still collapses to a card on mobile.
  if (selectable) {
    const outerClass = cn(
      'flex w-full flex-row items-start gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0',
      'sm:items-center sm:py-2',
      (interactive || selectable) && 'hover:bg-accent/40',
      selected && 'bg-accent/30',
      isRunning && 'task-running',
      isWaiting && 'task-waiting',
    );
    const innerClass = cn(
      'flex min-w-0 flex-1 flex-col gap-1 text-left',
      'sm:flex-row sm:items-center sm:gap-3',
    );
    return (
      <div style={style} className={outerClass}>
        <SelectableIcon Icon={Square} selected={selected} onToggle={(sk) => onToggleSelect?.(sk)} />
        {interactive ? (
          <button type="button" onClick={onSelect} className={innerClass}>
            {body}
          </button>
        ) : (
          <div className={innerClass}>{body}</div>
        )}
      </div>
    );
  }

  if (interactive) {
    return (
      <button type="button" onClick={onSelect} style={style} className={rowBase}>
        {body}
      </button>
    );
  }
  return (
    <div style={style} className={rowBase}>
      {body}
    </div>
  );
}
