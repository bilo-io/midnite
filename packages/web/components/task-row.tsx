import type { Task } from '@midnite/shared';
import { ProjectTag } from '@/components/project-tag';
import type { ProjectTagInfo } from '@/components/task-card';
import { statusLabel, statusHueVar } from '@/components/task-columns';
import { cn } from '@/lib/utils';

const KIND_LABELS: Record<NonNullable<Task['kind']>, string> = {
  bug: 'Bug',
  feature: 'Feature',
  question: 'Question',
  chore: 'Chore',
  unknown: 'Task',
};
const KIND_HUE_VARS: Record<NonNullable<Task['kind']>, string> = {
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
}: {
  task: Task;
  project?: ProjectTagInfo;
  onSelect?: () => void;
  showStatus?: boolean;
}) {
  const kind = task.kind ?? 'unknown';
  const interactive = Boolean(onSelect);

  const body = (
    <>
      <span
        className="inline-flex w-20 shrink-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
        style={{ background: 'hsl(var(--kind-hue) / 0.12)', color: 'hsl(var(--kind-hue))' }}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--kind-hue))' }} />
        {KIND_LABELS[kind]}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
      {task.repo && (
        <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:inline">{task.repo}</span>
      )}
      {project && <ProjectTag tag={project.tag} color={project.color} className="shrink-0" />}
      {showStatus && (
        <span
          className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground"
          style={{ ['--st-hue' as string]: `var(${statusHueVar(task.status)})` }}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--st-hue))' }} />
          {statusLabel(task.status)}
        </span>
      )}
    </>
  );

  const className = cn(
    'flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 text-left last:border-b-0',
    interactive && 'hover:bg-accent/40',
  );
  const style = { ['--kind-hue' as string]: `var(${KIND_HUE_VARS[kind]})` };

  if (interactive) {
    return (
      <button type="button" onClick={onSelect} style={style} className={className}>
        {body}
      </button>
    );
  }
  return (
    <div style={style} className={className}>
      {body}
    </div>
  );
}
