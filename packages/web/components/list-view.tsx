'use client';

import type { Project, TaskSummary } from '@midnite/shared';
import { useTranslations } from 'next-intl';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProjectTag } from '@/components/project-tag';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { TaskRow } from '@/components/task-row';
import { type TaskViewProps, groupTasksByProject } from '@/components/task-columns';
import { WindowVirtualList } from '@/components/ui/window-virtual-list';

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * List layout for the Tasks page: tasks grouped under reorderable, collapsible
 * per-project accordion headings — mirroring the Projects tree ("table" view).
 * Presentational — filtering, the project lookup and the detail modal are owned
 * by TasksView.
 */
export function ListView({
  tasks,
  projects,
  onSelect,
  isSelected,
  onToggleSelect,
  blockedCounts,
}: TaskViewProps & { projects: Project[] }) {
  const t = useTranslations('board');
  const groups = groupTasksByProject(tasks, projects, t('unassigned'));
  const projectById = new Map(projects.map((p) => [p.id, p] as const));

  const taskBody = (items: TaskSummary[]) =>
    items.length === 0 ? (
      <p className="px-3 py-3 text-xs text-muted-foreground">{t('nothingHere')}</p>
    ) : (
      <WindowVirtualList
        items={items}
        rowKey={(task) => task.id}
        renderRow={(task) => (
          <TaskRow
            task={task}
            showStatus
            onSelect={() => onSelect(task)}
            selected={isSelected?.(task.id) ?? false}
            onToggleSelect={onToggleSelect ? (sk) => onToggleSelect(task.id, sk) : undefined}
            blockedBy={blockedCounts?.get(task.id)}
          />
        )}
      />
    );

  const sections: AccordionSection[] = groups.map((g) => {
    const project = g.projectId ? projectById.get(g.projectId) : undefined;
    return {
      id: g.key,
      label: g.name,
      color: g.color,
      leading: project ? (
        <span className="flex items-center gap-2">
          <ProjectTag tag={project.tag} color={project.color} />
          <ProjectStatusBadge project={project} />
        </span>
      ) : undefined,
      count: g.tasks.length,
      summary: plural(g.tasks.length, 'task'),
      body: taskBody(g.tasks),
    };
  });

  return (
    <div className="min-h-0 flex-1 pb-1">
      {groups.length === 0 ? (
        <p className="px-1 py-8 text-center text-sm text-muted-foreground">{t('nothingHere')}</p>
      ) : (
        <SortableAccordions sections={sections} storageKey="midnite.tasks.listGroups" variant="split" />
      )}
    </div>
  );
}
