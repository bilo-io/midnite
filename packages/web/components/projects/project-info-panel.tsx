'use client';

import { useRouter } from 'next/navigation';
import { Brain, ChevronRight } from 'lucide-react';
import type { Project, TaskSummary } from '@midnite/shared';
import { statusLabel, statusHueVar } from '@/components/task-columns';
import { relativeTime } from '@/lib/utils';

type Props = {
  project: Project;
  tasks: TaskSummary[];
  /** Open a task from the activity list (navigates to the task page on the page shell). */
  onSelectTask?: (task: TaskSummary) => void;
};

/** How many recent tasks the activity section surfaces. */
const ACTIVITY_LIMIT = 6;

/**
 * Right rail (Phase 55 C): a link to the project's knowledge (Memory) + a short
 * Activity list of its most recently-updated tasks. Phase 65 F retired the
 * per-project "sources" concept — knowledge now lives in project-scoped memories,
 * so this points there instead of embedding a sources editor.
 */
export function ProjectInfoPanel({ project, tasks, onSelectTask }: Props) {
  const router = useRouter();
  const recent = [...tasks]
    .sort((a, b) => tsOf(b).localeCompare(tsOf(a)))
    .slice(0, ACTIVITY_LIMIT);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Knowledge</span>
        <button
          type="button"
          onClick={() => router.push(`/memory?scope=${encodeURIComponent(project.id)}`)}
          className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-2 text-left text-sm transition-colors hover:border-foreground/20 hover:bg-accent/40"
        >
          <Brain className="h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]" />
          <span className="min-w-0 flex-1 truncate">Manage knowledge in Memory</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
        <p className="text-[11px] text-muted-foreground">
          Sources and notes for this project live in its scoped memories, injected into agent prompts.
        </p>
      </div>

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
