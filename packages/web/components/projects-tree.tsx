'use client';

import { Folder, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Project, Status, TaskSummary } from '@midnite/shared';
import { OverflowMenu, type OverflowMenuItem } from '@/components/overflow-menu';
import { ProjectNameLink } from '@/components/project-name-link';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProjectTag } from '@/components/project-tag';
import { ProjectTaskGroups } from '@/components/project-task-groups';
import { SelectableIcon } from '@/components/selectable-icon';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';

/**
 * Tree layout for the Projects page: each project is a collapsible, drag-reorderable
 * accordion whose children are further naked, drag-reorderable sub-accordions
 * grouping its tasks by status (`ProjectTaskGroups`). A trailing "Unassigned"
 * section collects tasks with no project. Collapsed sections summarise task
 * and source counts; a completion bar sits beside the count.
 */
export function ProjectsTree({
  projects,
  tasks,
  onEdit,
  onPlan,
  onDelete,
  onAddTask,
  onSelectTask,
  isSelected,
  onToggleSelect,
}: {
  projects: Project[];
  tasks: TaskSummary[];
  onEdit?: (project: Project) => void;
  onPlan?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  /** Open the new-task form seeded with this project (undefined for Unassigned) and, optionally, a status. */
  onAddTask?: (projectId: string | undefined, status?: Status) => void;
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

  const taskGroups = (items: TaskSummary[], storageKey: string, projectId: string | undefined) => (
    <ProjectTaskGroups
      tasks={items}
      storageKey={storageKey}
      onSelect={onSelectTask}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      projectId={projectId}
      onAddTask={onAddTask}
    />
  );

  const buildProjectMenuItems = (p: Project): OverflowMenuItem[] => {
    const items: OverflowMenuItem[] = [];
    if (onAddTask) items.push({ key: 'add', label: 'Add task', icon: Plus, onClick: () => onAddTask(p.id) });
    if (onPlan) items.push({ key: 'plan', label: 'Plan', icon: ListChecks, onClick: () => onPlan(p) });
    if (onEdit) items.push({ key: 'edit', label: 'Edit', icon: Pencil, onClick: () => onEdit(p) });
    if (onDelete) {
      items.push({ key: 'delete', label: 'Delete', icon: Trash2, destructive: true, onClick: () => onDelete(p) });
    }
    return items;
  };

  const sections: AccordionSection[] = projects.map((p) => {
    const items = tasksByProject.get(p.id) ?? [];
    const done = items.filter((task) => task.status === 'done').length;
    return {
      id: p.id,
      label: <ProjectNameLink projectId={p.id} name={p.name} />,
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
      summary: `${items.length} task${items.length === 1 ? '' : 's'}`,
      progress: { done, total: items.length },
      actions: <OverflowMenu ariaLabel={`${p.name} options`} items={buildProjectMenuItems(p)} />,
      body: taskGroups(items, `midnite.projects.tree.status.${p.id}`, p.id),
    };
  });

  if (unassigned.length > 0) {
    const unassignedMenuItems: OverflowMenuItem[] = onAddTask
      ? [{ key: 'add', label: 'Add task', icon: Plus, onClick: () => onAddTask(undefined) }]
      : [];
    sections.push({
      id: '__unassigned__',
      label: 'Unassigned',
      hue: '215 14% 52%',
      count: unassigned.length,
      summary: `${unassigned.length} task${unassigned.length === 1 ? '' : 's'}`,
      progress: { done: unassigned.filter((task) => task.status === 'done').length, total: unassigned.length },
      actions:
        unassignedMenuItems.length > 0 ? (
          <OverflowMenu ariaLabel="Unassigned options" items={unassignedMenuItems} />
        ) : undefined,
      body: taskGroups(unassigned, 'midnite.projects.tree.status.__unassigned__', undefined),
    });
  }

  return <SortableAccordions sections={sections} storageKey="midnite.projects.tree" variant="split" />;
}
