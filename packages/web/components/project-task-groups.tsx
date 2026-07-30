'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Status, TaskSummary } from '@midnite/shared';
import { DraggableTaskRow } from '@/components/draggable-task-row';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { TaskRow } from '@/components/task-row';
import { ALL_COLUMNS, groupByStatus } from '@/components/task-columns';
import { WindowVirtualList } from '@/components/ui/window-virtual-list';
import { statusDropTarget } from '@/lib/task-transitions';

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Inside one project's accordion (the Tasks list view / the Projects tree):
 * further collapsible, drag-reorderable "naked" sub-accordions grouping that
 * project's tasks by status. Order and collapsed state persist per project —
 * `storageKey` must be unique per project (and per page, since the two pages
 * keep independent orderings) so one project's rearrangement doesn't leak into
 * another's. Only statuses the project actually has tasks in are shown.
 *
 * The exception is when `onMove` is wired (the Tasks list view): rows are then
 * draggable between status groups, so every primary status renders even when
 * empty — an absent section is a target you couldn't drop on. Without `onMove`
 * (the Projects tree) the empty-status groups stay hidden as before.
 */
export function ProjectTaskGroups({
  tasks,
  storageKey,
  onSelect,
  isSelected,
  onToggleSelect,
  blockedCounts,
  projectId,
  onAddTask,
  onMove,
}: {
  tasks: TaskSummary[];
  storageKey: string;
  onSelect?: (task: TaskSummary) => void;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
  blockedCounts?: Map<string, number>;
  /** The project these tasks belong to (undefined for the Unassigned group) —
   *  forwarded to `onAddTask` so the new-task form is seeded with it. */
  projectId?: string;
  /** Open the new-task form seeded with this status group's project + status. */
  onAddTask?: (projectId: string | undefined, status?: Status) => void;
  /** Move a task to another status by dragging its row into that status group.
   *  Supplying it also turns the rows into drag sources — see the note above. */
  onMove?: (taskId: string, target: Status) => void;
}) {
  const t = useTranslations('board');
  const grouped = groupByStatus(tasks);
  const statusById = new Map(tasks.map((task) => [task.id, task.status] as const));

  // Section ids are statuses; `statusDropTarget` decides whether the drop is a
  // legal move (it ignores no-ops and illegal edges out of a terminal status).
  const onItemDrop = onMove
    ? (taskId: string, sectionId: string) => {
        const to = statusDropTarget(statusById.get(taskId), sectionId);
        if (to) onMove(taskId, to);
      }
    : undefined;

  const sections: AccordionSection[] = ALL_COLUMNS.map((col) => ({ col, items: grouped.get(col.status) ?? [] }))
    .filter(({ col, items }) => items.length > 0 || (Boolean(onMove) && col.status !== 'abandoned'))
    .map(({ col, items }) => ({
      id: col.status,
      label: t(`columns.${col.status}`),
      hue: `var(${col.hueVar})`,
      count: items.length,
      summary: plural(items.length, 'task'),
      actions: onAddTask ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddTask(projectId, col.status);
          }}
          aria-label={t('addTask', { column: t(`columns.${col.status}`) })}
          className="rounded p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : undefined,
      body:
        items.length === 0 ? (
          // Only reachable in the drag-enabled (list view) case — an empty status
          // still has to be a visible, droppable target.
          <p className="px-3 py-2 text-xs text-muted-foreground">{t('nothingHere')}</p>
        ) : (
          <WindowVirtualList
            items={items}
            rowKey={(task) => task.id}
            renderRow={(task) => {
              const rowProps = {
                task,
                onSelect: onSelect ? () => onSelect(task) : undefined,
                selected: isSelected?.(task.id) ?? false,
                onToggleSelect: onToggleSelect ? (sk: boolean) => onToggleSelect(task.id, sk) : undefined,
                blockedBy: blockedCounts?.get(task.id),
              };
              return onItemDrop ? <DraggableTaskRow {...rowProps} /> : <TaskRow {...rowProps} />;
            }}
          />
        ),
    }));

  if (sections.length === 0) {
    return <p className="px-3 py-3 text-xs text-muted-foreground">{t('nothingHere')}</p>;
  }

  return (
    <div className="p-2">
      <SortableAccordions
        sections={sections}
        storageKey={storageKey}
        variant="bare"
        onItemDrop={onItemDrop}
      />
    </div>
  );
}
