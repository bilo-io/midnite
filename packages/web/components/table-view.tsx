'use client';

import { useTranslations } from 'next-intl';
import { AbandonedRow } from '@/components/abandoned-row';
import { DraggableTaskRow } from '@/components/draggable-task-row';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { TaskRow } from '@/components/task-row';
import { type TaskViewProps, distinctProjectCount, groupByStatus } from '@/components/task-columns';
import { statusDropTarget } from '@/lib/task-transitions';

/**
 * Table layout for the Tasks page: each status is a collapsible accordion section
 * acting as a column delimiter, with task rows beneath. Sections reorder by drag;
 * order and collapsed state persist via SortableAccordions.
 *
 * Rows are draggable between sections when `onMove` is wired — the same status move
 * as dragging a card across board columns, including the start/stop side effects of
 * entering or leaving "In progress" (TasksView's `onMove` owns those). Illegal
 * edges are dropped on the floor rather than round-tripped: `canTransition` is the
 * one table both the board and the gateway agree on.
 */
export function TableView({
  tasks,
  columns,
  projectsById,
  onSelect,
  showAbandoned,
  onMove,
  isSelected,
  onToggleSelect,
  blockedCounts,
}: TaskViewProps) {
  const t = useTranslations('board');
  const grouped = groupByStatus(tasks);
  const statusById = new Map(tasks.map((task) => [task.id, task.status] as const));

  // A row landed on a status section: move it if `statusDropTarget` says the edge
  // is legal (it owns the no-op / illegal-edge rules).
  const onItemDrop = onMove
    ? (taskId: string, sectionId: string) => {
        const to = statusDropTarget(statusById.get(taskId), sectionId);
        if (to) onMove(taskId, to);
      }
    : undefined;

  const sections: AccordionSection[] = columns.map((col) => {
    const items = grouped.get(col.status) ?? [];
    const projects = distinctProjectCount(items);
    return {
      id: col.status,
      label: t(`columns.${col.status}`),
      hue: `var(${col.hueVar})`,
      count: items.length,
      summary:
        items.length === 0
          ? t('sections.empty')
          : t('sections.summary', { tasks: items.length, projects }),
      body:
        items.length === 0 ? (
          // Still rendered when empty: an empty status has to stay a drop target,
          // and it's the section (not the rows) that receives the drop.
          <div className="px-4 py-3 text-xs text-muted-foreground">{t('nothingHere')}</div>
        ) : (
          items.map((task) => {
            const rowProps = {
              task,
              project: task.projectId ? projectsById.get(task.projectId) : undefined,
              onSelect: () => onSelect(task),
              selected: isSelected?.(task.id) ?? false,
              onToggleSelect: onToggleSelect ? (sk: boolean) => onToggleSelect(task.id, sk) : undefined,
              blockedBy: blockedCounts?.get(task.id),
            };
            return onItemDrop ? (
              <DraggableTaskRow key={task.id} {...rowProps} />
            ) : (
              <TaskRow key={task.id} {...rowProps} />
            );
          })
        ),
    };
  });

  return (
    // No inner scroll region — the document is the page's one scroll area, so
    // the sticky toolbar pins while the accordions scroll under it.
    <div className="min-h-0 flex-1 pb-1">
      <SortableAccordions
        sections={sections}
        storageKey="midnite.tasks.sections"
        variant="split"
        onItemDrop={onItemDrop}
      />
      {showAbandoned && (
        <div className="mt-2">
          <AbandonedRow
            tasks={grouped.get('abandoned') ?? []}
            onSelect={onSelect}
            projectsById={projectsById}
            layout="table"
            blockedCounts={blockedCounts}
          />
        </div>
      )}
    </div>
  );
}
