'use client';

import { Folder, ListChecks, Pencil } from 'lucide-react';
import type { Project, TaskSummary } from '@midnite/shared';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProjectTag } from '@/components/project-tag';
import { SelectableIcon } from '@/components/selectable-icon';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { TaskRow } from '@/components/task-row';
import { WindowVirtualList } from '@/components/ui/window-virtual-list';

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Tree layout for the Projects page: each project is a collapsible, drag-reorderable
 * accordion whose children are its tasks. A trailing "Unassigned" section collects
 * tasks with no project. Collapsed sections summarise task and source counts.
 */
export function ProjectsTree({
  projects,
  tasks,
  onEdit,
  onPlan,
  onSelectTask,
  isSelected,
  onToggleSelect,
}: {
  projects: Project[];
  tasks: TaskSummary[];
  onEdit?: (project: Project) => void;
  onPlan?: (project: Project) => void;
  onSelectTask?: (task: TaskSummary) => void;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
}) {
  const tasksByProject = new Map<string, TaskSummary[]>();
  const unassigned: TaskSummary[] = [];
  for (const t of tasks) {
    if (t.projectId) {
      const list = tasksByProject.get(t.projectId) ?? [];
      list.push(t);
      tasksByProject.set(t.projectId, list);
    } else {
      unassigned.push(t);
    }
  }

  const taskBody = (items: TaskSummary[]) =>
    items.length === 0 ? (
      <div className="px-4 py-3 text-xs text-muted-foreground">No tasks yet</div>
    ) : (
      <WindowVirtualList
        items={items}
        rowKey={(t) => t.id}
        renderRow={(t) => (
          <TaskRow task={t} showStatus onSelect={onSelectTask ? () => onSelectTask(t) : undefined} />
        )}
      />
    );

  const sections: AccordionSection[] = projects.map((p) => {
    const items = tasksByProject.get(p.id) ?? [];
    return {
      id: p.id,
      label: p.name,
      prefix: onToggleSelect ? (
        <SelectableIcon
          Icon={Folder}
          selected={isSelected?.(p.id) ?? false}
          onToggle={(shiftKey) => onToggleSelect(p.id, shiftKey)}
        />
      ) : undefined,
      leading: (
        <span className="flex items-center gap-2">
          <ProjectTag tag={p.tag} color={p.color} />
          <ProjectStatusBadge project={p} />
        </span>
      ),
      count: items.length,
      summary: plural(items.length, 'task'),
      actions: (
        <>
          {onPlan ? (
            <button
              type="button"
              onClick={() => onPlan(p)}
              aria-label={`Plan ${p.name}`}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            >
              <ListChecks className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(p)}
              aria-label={`Edit ${p.name}`}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </>
      ),
      body: taskBody(items),
    };
  });

  if (unassigned.length > 0) {
    sections.push({
      id: '__unassigned__',
      label: 'Unassigned',
      hue: '215 14% 52%',
      count: unassigned.length,
      summary: plural(unassigned.length, 'task'),
      body: taskBody(unassigned),
    });
  }

  return <SortableAccordions sections={sections} storageKey="midnite.projects.tree" variant="split" />;
}
