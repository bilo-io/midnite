'use client';

import type { Project, TaskSummary } from '@midnite/shared';
import { ProjectSourcesPanel } from '@/components/projects/panels/project-sources-panel';
import { statusLabel, statusHueVar } from '@/components/task-columns';
import { relativeTime } from '@/lib/utils';

type Props = {
  project: Project;
  tasks: TaskSummary[];
  /** Re-hydrate the project after a source add/remove/reorder. */
  onChange: (project: Project) => void;
  /** Open a task from the activity list (navigates to the task page on the page shell). */
  onSelectTask?: (task: TaskSummary) => void;
};

/** How many recent tasks the activity section surfaces. */
const ACTIVITY_LIMIT = 6;

/**
 * Right rail (Phase 55 C): the project's Sources (reused editor) + a short
 * Activity list of its most recently-updated tasks. Both derive from data
 * already fetched — no per-project event stream is fabricated.
 */
export function ProjectInfoPanel({ project, tasks, onChange, onSelectTask }: Props) {
  const recent = [...tasks]
    .sort((a, b) => tsOf(b).localeCompare(tsOf(a)))
    .slice(0, ACTIVITY_LIMIT);

  return (
    <div className="space-y-5">
      <ProjectSourcesPanel project={project} onChange={onChange} />

      <div className="space-y-2 border-t border-border/60 pt-4">
        <span className="text-xs font-medium text-muted-foreground">Activity</span>
        {recent.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No task activity yet.</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={onSelectTask ? () => onSelectTask(t) : undefined}
                  disabled={!onSelectTask}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors enabled:hover:bg-accent/50 disabled:cursor-default"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: `hsl(var(${statusHueVar(t.status)}))` }}
                    title={statusLabel(t.status)}
                  />
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{tsOf(t) ? relativeTime(tsOf(t)) : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Best-available timestamp for ordering/relative-time (updatedAt ?? createdAt). */
function tsOf(t: TaskSummary): string {
  return t.updatedAt ?? t.createdAt ?? '';
}
