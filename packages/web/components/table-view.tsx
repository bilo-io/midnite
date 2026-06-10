'use client';

import { AbandonedRow } from '@/components/abandoned-row';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { TaskRow } from '@/components/task-row';
import { type TaskViewProps, distinctProjectCount, groupByStatus } from '@/components/task-columns';

/**
 * Table layout for the Tasks page: each status is a collapsible accordion section
 * acting as a column delimiter, with task rows beneath. Sections reorder by drag;
 * order and collapsed state persist via SortableAccordions. Task rows are not
 * draggable — task status follows the Claude session, not manual moves.
 */
export function TableView({ tasks, columns, projectsById, onSelect, showAbandoned }: TaskViewProps) {
  const grouped = groupByStatus(tasks);

  const sections: AccordionSection[] = columns.map((col) => {
    const items = grouped.get(col.status) ?? [];
    const projects = distinctProjectCount(items);
    return {
      id: col.status,
      label: col.label,
      hue: `var(${col.hueVar})`,
      count: items.length,
      summary:
        items.length === 0
          ? 'Empty'
          : `${items.length} task${items.length === 1 ? '' : 's'} · ${projects} project${
              projects === 1 ? '' : 's'
            }`,
      body:
        items.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted-foreground/70">Nothing here</div>
        ) : (
          items.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              project={t.projectId ? projectsById.get(t.projectId) : undefined}
              onSelect={() => onSelect(t)}
            />
          ))
        ),
    };
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-1">
      <SortableAccordions sections={sections} storageKey="midnite.tasks.sections" />
      {showAbandoned && (
        <div className="mt-2">
          <AbandonedRow
            tasks={grouped.get('abandoned') ?? []}
            onSelect={onSelect}
            projectsById={projectsById}
            layout="table"
          />
        </div>
      )}
    </div>
  );
}
