'use client';

import { AbandonedRow } from '@/components/abandoned-row';
import { TaskCard } from '@/components/task-card';
import { type TaskViewProps, groupByStatus } from '@/components/task-columns';

/**
 * Kanban layout for the Tasks page: one column per visible status, scrolling
 * horizontally. Presentational — filtering, the project lookup and the detail
 * modal are owned by TasksView.
 */
export function BoardView({ tasks, columns, projectsById, onSelect, showAbandoned }: TaskViewProps) {
  const grouped = groupByStatus(tasks);

  return (
    <>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
        {columns.map((col) => {
          const items = grouped.get(col.status) ?? [];
          return (
            <section
              key={col.status}
              className="relative flex h-full min-w-[240px] flex-1 flex-col overflow-hidden rounded-lg border bg-card/60 p-3 backdrop-blur-sm"
              style={{ ['--col-hue' as string]: `var(${col.hueVar})` }}
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, transparent, hsl(var(--col-hue) / 0.7), transparent)',
                }}
              />
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: 'hsl(var(--col-hue))',
                      boxShadow: '0 0 8px -1px hsl(var(--col-hue) / 0.7)',
                    }}
                  />
                  {col.label}
                </h2>
                <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground/70">
                  Nothing here
                </div>
              ) : (
                <div className="-mr-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                  {items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      project={t.projectId ? projectsById.get(t.projectId) : undefined}
                      onSelect={() => onSelect(t)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {showAbandoned && (
        <AbandonedRow
          tasks={grouped.get('abandoned') ?? []}
          onSelect={onSelect}
          projectsById={projectsById}
        />
      )}
    </>
  );
}
