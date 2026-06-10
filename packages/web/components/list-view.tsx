'use client';

import { AbandonedRow } from '@/components/abandoned-row';
import { TaskRow } from '@/components/task-row';
import { type TaskViewProps, groupByStatus } from '@/components/task-columns';

/**
 * List layout for the Tasks page: a single flat column of task rows across the
 * visible statuses (in column order), each row trailing its status. Presentational
 * — filtering, the project lookup and the detail modal are owned by TasksView.
 */
export function ListView({ tasks, columns, projectsById, onSelect, showAbandoned }: TaskViewProps) {
  const grouped = groupByStatus(tasks);
  const rows = columns.flatMap((col) => grouped.get(col.status) ?? []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-1">
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          No tasks here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {rows.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              project={t.projectId ? projectsById.get(t.projectId) : undefined}
              onSelect={() => onSelect(t)}
              showStatus
            />
          ))}
        </div>
      )}

      {showAbandoned && (
        <div className="mt-2">
          <AbandonedRow
            tasks={grouped.get('abandoned') ?? []}
            onSelect={onSelect}
            projectsById={projectsById}
            layout="list"
          />
        </div>
      )}
    </div>
  );
}
