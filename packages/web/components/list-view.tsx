'use client';

import { AbandonedRow } from '@/components/abandoned-row';
import { CollapsibleStatusGroups, type StatusGroup } from '@/components/collapsible-status-groups';
import { TaskRow } from '@/components/task-row';
import { type TaskViewProps, groupByStatus } from '@/components/task-columns';

/**
 * List layout for the Tasks page: tasks grouped under reorderable, collapsible
 * per-status accordion headings (mirroring the Sessions list view). Presentational
 * — filtering, the project lookup and the detail modal are owned by TasksView.
 */
export function ListView({
  tasks,
  columns,
  projectsById,
  onSelect,
  showAbandoned,
  isSelected,
  onToggleSelect,
  blockedCounts,
}: TaskViewProps) {
  const grouped = groupByStatus(tasks);

  const groups: StatusGroup[] = columns.map((col) => {
    const items = grouped.get(col.status) ?? [];
    return {
      id: col.status,
      label: col.label,
      hue: `var(${col.hueVar})`,
      count: items.length,
      body:
        items.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">Nothing here</p>
        ) : (
          <div className="overflow-hidden rounded-lg border surface-glass">
            {items.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                project={t.projectId ? projectsById.get(t.projectId) : undefined}
                onSelect={() => onSelect(t)}
                selected={isSelected?.(t.id) ?? false}
                onToggleSelect={onToggleSelect ? (sk) => onToggleSelect(t.id, sk) : undefined}
                blockedBy={blockedCounts?.get(t.id)}
              />
            ))}
          </div>
        ),
    };
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-1">
      <CollapsibleStatusGroups groups={groups} storageKey="midnite.tasks.listGroups" />

      {showAbandoned && (
        <div className="mt-2">
          <AbandonedRow
            tasks={grouped.get('abandoned') ?? []}
            onSelect={onSelect}
            projectsById={projectsById}
            layout="list"
            blockedCounts={blockedCounts}
          />
        </div>
      )}
    </div>
  );
}
