'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Status, TaskSummary } from '@midnite/shared';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { TaskRow } from '@/components/task-row';
import { ALL_COLUMNS, groupByStatus } from '@/components/task-columns';
import { WindowVirtualList } from '@/components/ui/window-virtual-list';

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
}) {
  const t = useTranslations('board');
  const grouped = groupByStatus(tasks);

  const sections: AccordionSection[] = ALL_COLUMNS.map((col) => ({ col, items: grouped.get(col.status) ?? [] }))
    .filter(({ items }) => items.length > 0)
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
      body: (
        <WindowVirtualList
          items={items}
          rowKey={(task) => task.id}
          renderRow={(task) => (
            <TaskRow
              task={task}
              onSelect={onSelect ? () => onSelect(task) : undefined}
              selected={isSelected?.(task.id) ?? false}
              onToggleSelect={onToggleSelect ? (sk) => onToggleSelect(task.id, sk) : undefined}
              blockedBy={blockedCounts?.get(task.id)}
            />
          )}
        />
      ),
    }));

  if (sections.length === 0) {
    return <p className="px-3 py-3 text-xs text-muted-foreground">{t('nothingHere')}</p>;
  }

  return (
    <div className="p-2">
      <SortableAccordions sections={sections} storageKey={storageKey} variant="bare" />
    </div>
  );
}
