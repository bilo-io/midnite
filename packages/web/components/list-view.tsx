'use client';

import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Project, Status } from '@midnite/shared';
import { useTranslations } from 'next-intl';
import { OverflowMenu, type OverflowMenuItem } from '@/components/overflow-menu';
import { projectPageHref } from '@/lib/project-route';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProjectTag } from '@/components/project-tag';
import { ProjectTaskGroups } from '@/components/project-task-groups';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { type TaskViewProps, groupTasksByProject } from '@/components/task-columns';

/**
 * List layout for the Tasks page: tasks grouped under reorderable, collapsible
 * per-project accordion headings — mirroring the Projects tree ("table" view).
 * Each project's body further splits into naked, drag-reorderable sub-accordions
 * by status (`ProjectTaskGroups`). Presentational — filtering, the project
 * lookup and the detail modal are owned by TasksView.
 */
export function ListView({
  tasks,
  projects,
  onSelect,
  isSelected,
  onToggleSelect,
  blockedCounts,
  onEditProject,
  onDeleteProject,
  onAddTask,
}: TaskViewProps & {
  projects: Project[];
  /** Navigate to a project's detail page from the group header's menu. */
  onEditProject?: (project: Project) => void;
  /** Delete a project from the group header's menu (its tasks become unassigned). */
  onDeleteProject?: (project: Project) => void;
  /** Open the new-task form seeded with this project (undefined for Unassigned) and, optionally, a status. */
  onAddTask?: (projectId: string | undefined, status?: Status) => void;
}) {
  const t = useTranslations('board');
  const groups = groupTasksByProject(tasks, projects, t('unassigned'));
  const projectById = new Map(projects.map((p) => [p.id, p] as const));

  const sections: AccordionSection[] = groups.map((g) => {
    const project = g.projectId ? projectById.get(g.projectId) : undefined;
    const done = g.tasks.filter((task) => task.status === 'done').length;
    const menuItems: OverflowMenuItem[] = [
      ...(onAddTask ? [{ key: 'add', label: 'Add task', icon: Plus, onClick: () => onAddTask(g.projectId) }] : []),
      ...(project && onEditProject
        ? [{ key: 'edit', label: 'Edit', icon: Pencil, onClick: () => onEditProject(project) }]
        : []),
      ...(project && onDeleteProject
        ? [{ key: 'delete', label: 'Delete', icon: Trash2, destructive: true, onClick: () => onDeleteProject(project) }]
        : []),
    ];
    return {
      id: g.key,
      label: project ? (
        <Link
          href={projectPageHref(project.id)}
          onClick={(e) => e.stopPropagation()}
          className="hover:underline"
        >
          {g.name}
        </Link>
      ) : (
        g.name
      ),
      color: g.color,
      leading: project ? (
        <span className="flex items-center gap-2">
          <ProjectTag tag={project.tag} color={project.color} />
          <ProjectStatusBadge project={project} />
        </span>
      ) : undefined,
      count: g.tasks.length,
      summary: `${g.tasks.length} task${g.tasks.length === 1 ? '' : 's'}`,
      progress: { done, total: g.tasks.length },
      actions: menuItems.length > 0 ? <OverflowMenu ariaLabel={`${g.name} options`} items={menuItems} /> : undefined,
      body: (
        <ProjectTaskGroups
          tasks={g.tasks}
          storageKey={`midnite.tasks.listGroups.status.${g.key}`}
          onSelect={onSelect}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          blockedCounts={blockedCounts}
          projectId={g.projectId}
          onAddTask={onAddTask}
        />
      ),
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
