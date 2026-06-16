'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Folder, LayoutGrid, List, ListTree, Plus } from 'lucide-react';
import type { Memory, Project, Task } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { EmptyState } from '@/components/empty-state';
import { useConfirm } from '@/components/confirm-dialog';
import { ProjectCard } from '@/components/project-card';
import { ProjectModal } from '@/components/project-modal';
import { ProjectsTree } from '@/components/projects-tree';
import { PlanPanel } from '@/components/plan-panel';
import { TaskThreadModal } from '@/components/task-thread-modal';
import { TemplateCard } from '@/components/template-card';
import { TemplateModal } from '@/components/template-modal';
import { TemplatesTable } from '@/components/templates-table';
import { deleteProject, updateProject } from '@/lib/api';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { TEMPLATES, createBlankTemplate, type Template } from './templates';
import { cn } from '@/lib/utils';

type View = 'list' | 'grid' | 'table';
const VIEWS: readonly View[] = ['list', 'grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.projects.view';
const TEMPLATES_STORAGE_KEY = 'midnite.templates';

type Tab = 'projects' | 'templates';
const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'projects', label: 'Projects' },
  { value: 'templates', label: 'Templates' },
];

export function ProjectsView({
  initial,
  tasks,
  memories = [],
}: {
  initial: Project[];
  tasks: Task[];
  memories?: Memory[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>('grid');
  const [tab, setTab] = useState<Tab>('projects');
  const [creating, setCreating] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [planProject, setPlanProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);
  const [expandTemplateId, setExpandTemplateId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && (VIEWS as readonly string[]).includes(stored)) setView(stored as View);
    try {
      const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setTemplates(parsed as Template[]);
      }
    } catch {
      // ignore storage failures; fall back to the built-in templates.
    }
  }, []);

  const onSetView = useCallback((next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  const persistTemplates = useCallback((next: Template[]) => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // best-effort
    }
  }, []);

  const updateTemplate = useCallback(
    (id: string, patch: Partial<Template>) => {
      setTemplates((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
        persistTemplates(next);
        return next;
      });
    },
    [persistTemplates],
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      setTemplates((prev) => {
        const next = prev.filter((t) => t.id !== id);
        persistTemplates(next);
        return next;
      });
      setOpenTemplateId((cur) => (cur === id ? null : cur));
    },
    [persistTemplates],
  );

  const newTemplate = useCallback(() => {
    const t = createBlankTemplate();
    setTemplates((prev) => {
      const next = [t, ...prev];
      persistTemplates(next);
      return next;
    });
    // Open it for editing: the modal in card views, an expanded row in the table.
    if (view === 'table') setExpandTemplateId(t.id);
    else setOpenTemplateId(t.id);
  }, [persistTemplates, view]);

  const refresh = useCallback(() => router.refresh(), [router]);

  // --- Bulk selection (projects tab only) ---
  const confirm = useConfirm();
  const {
    selectedIds,
    count: selectedCount,
    clear: clearSelection,
    isSelected,
    toggle: toggleSelect,
  } = useBulkSelection();

  // Selection is meaningful only on the projects tab; drop it when leaving.
  useEffect(() => {
    if (tab !== 'projects') clearSelection();
  }, [tab, clearSelection]);

  const selectedProjects = useMemo(
    () => initial.filter((p) => selectedIds.includes(p.id)),
    [initial, selectedIds],
  );

  const setArchivedFor = useCallback(
    async (ids: string[], archived: boolean) => {
      if (ids.length === 0) return;
      await Promise.all(ids.map((id) => updateProject(id, { archived })));
      clearSelection();
      refresh();
    },
    [clearSelection, refresh],
  );

  const deleteSelection = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.length} project${selectedIds.length === 1 ? '' : 's'}?`,
      description: 'Their tasks are kept but become unassigned. This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await Promise.all(selectedIds.map((id) => deleteProject(id)));
    clearSelection();
    refresh();
  }, [selectedIds, confirm, clearSelection, refresh]);

  const bulkActions = useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];
    const toArchive = selectedProjects.filter((p) => !p.archived).map((p) => p.id);
    const toUnarchive = selectedProjects.filter((p) => p.archived).map((p) => p.id);
    if (toArchive.length) {
      actions.push({
        key: 'archive',
        label: 'Archive',
        color: BULK_COLORS.archive,
        onClick: () => void setArchivedFor(toArchive, true),
      });
    }
    if (toUnarchive.length) {
      actions.push({
        key: 'unarchive',
        label: 'Unarchive',
        color: BULK_COLORS.archive,
        onClick: () => void setArchivedFor(toUnarchive, false),
      });
    }
    actions.push({
      key: 'delete',
      label: 'Delete',
      color: BULK_COLORS.delete,
      onClick: () => void deleteSelection(),
    });
    return actions;
  }, [selectedProjects, setArchivedFor, deleteSelection]);

  const closeModal = useCallback(() => {
    setCreating(false);
    setEditProject(null);
  }, []);

  const modalOpen = creating || editProject !== null;

  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filtered = q
    ? initial.filter((p) =>
        [p.name, p.tag, p.description ?? ''].some((f) => f.toLowerCase().includes(q)),
      )
    : initial;
  const filteredTemplates = q
    ? templates.filter((t) =>
        [t.name, t.tag, t.description].some((f) => f.toLowerCase().includes(q)),
      )
    : templates;

  const count = tab === 'projects' ? filtered.length : filteredTemplates.length;
  const openTemplate = templates.find((t) => t.id === openTemplateId) ?? null;

  return (
    <div className="space-y-4">
      <div className="reveal-controls flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-xs tabular-nums text-muted-foreground">
            {count} {tab === 'projects' ? 'project' : 'template'}
            {count === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                aria-pressed={tab === t.value}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  tab === t.value
                    ? 'border-foreground/20 bg-accent text-accent-foreground'
                    : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => onSetView('list')}
              className={cn('h-7 w-7', view === 'list' && 'bg-accent text-accent-foreground')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => onSetView('grid')}
              className={cn('h-7 w-7', view === 'grid' && 'bg-accent text-accent-foreground')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Tree view"
              aria-pressed={view === 'table'}
              onClick={() => onSetView('table')}
              className={cn('h-7 w-7', view === 'table' && 'bg-accent text-accent-foreground')}
            >
              <ListTree className="h-4 w-4" />
            </Button>
          </div>
          {tab === 'projects' ? (
            <Button type="button" size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={newTemplate}>
              <Plus className="h-4 w-4" />
              New template
            </Button>
          )}
        </div>
      </div>

      {tab === 'projects' ? (
        <BulkActionBar count={selectedCount} actions={bulkActions} onClear={clearSelection} />
      ) : null}

      <div className="reveal-content">
        {tab === 'templates' ? (
          templates.length === 0 ? (
            <EmptyState
              Icon={FileText}
              title="No templates yet"
              description="Create one to draft plans and specs from a reusable document."
              actionLabel="New template"
              onAction={newTemplate}
            />
          ) : filteredTemplates.length === 0 ? (
            <EmptyState Icon={FileText} title={`No templates match “${q}”`} />
          ) : view === 'table' ? (
            <TemplatesTable
              templates={filteredTemplates}
              onUpdate={updateTemplate}
              onDelete={deleteTemplate}
              expandId={expandTemplateId}
            />
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  layout="grid"
                  onOpen={() => setOpenTemplateId(t.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  layout="list"
                  onOpen={() => setOpenTemplateId(t.id)}
                />
              ))}
            </div>
          )
        ) : initial.length === 0 ? (
          <EmptyState
            Icon={Folder}
            title="No projects yet"
            description="Create one to group tasks, attach sources, and draft a plan."
            actionLabel="New project"
            onAction={() => setCreating(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState Icon={Folder} title={`No projects match “${q}”`} />
        ) : view === 'table' ? (
          <ProjectsTree
            projects={filtered}
            tasks={tasks}
            onEdit={setEditProject}
            onPlan={setPlanProject}
            onSelectTask={setSelectedTask}
            isSelected={isSelected}
            onToggleSelect={(id, sk) => toggleSelect(id, sk, filtered.map((x) => x.id))}
          />
        ) : view === 'list' ? (
          <div className="flex flex-col gap-2">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                layout="list"
                onOpen={() => setEditProject(p)}
                onPlan={() => setPlanProject(p)}
                selected={isSelected(p.id)}
                onToggleSelect={() => toggleSelect(p.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                layout="grid"
                onOpen={() => setEditProject(p)}
                onPlan={() => setPlanProject(p)}
                selected={isSelected(p.id)}
                onToggleSelect={() => toggleSelect(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen ? (
        <ProjectModal
          project={creating ? null : editProject}
          tasks={editProject ? tasks.filter((t) => t.projectId === editProject.id) : []}
          memories={memories}
          templates={templates}
          onSelectTask={(task) => {
            closeModal();
            setSelectedTask(task);
          }}
          onClose={closeModal}
          onSaved={refresh}
        />
      ) : null}

      {planProject ? (
        <PlanPanel
          project={planProject}
          onClose={() => setPlanProject(null)}
          onChanged={refresh}
        />
      ) : null}

      {selectedTask ? (
        <TaskThreadModal
          task={selectedTask}
          projects={initial}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}

      {openTemplate ? (
        <TemplateModal
          template={openTemplate}
          onSave={(patch) => updateTemplate(openTemplate.id, patch)}
          onDelete={() => deleteTemplate(openTemplate.id)}
          onClose={() => setOpenTemplateId(null)}
        />
      ) : null}
    </div>
  );
}
