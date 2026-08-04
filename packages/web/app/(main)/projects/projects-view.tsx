'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileText, Folder, LayoutGrid, List, ListTree, Plus } from 'lucide-react';
import type { Memory, Project, Repo, Status, Task, TaskSummary } from '@midnite/shared';
import { CountPill } from '@/components/count-pill';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { Button } from '@/components/ui/button';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { EmptyState } from '@/components/empty-state';
import { useConfirm } from '@/components/confirm-dialog';
import { NewTaskModal } from '@/components/new-task-modal';
import { ProjectCard } from '@/components/project-card';
import { ProjectModal } from '@/components/project-modal';
import { ProjectsTree } from '@/components/projects-tree';
import { PlanPanel } from '@/components/plan-panel';
import { SearchBar } from '@/components/search-bar';
import { WorkItemModal } from '@/components/work-item-modal';
import { TemplateCard } from '@/components/template-card';
import { TemplateModal } from '@/components/template-modal';
import { TemplatesTable } from '@/components/templates-table';
import { useToast } from '@/components/toast';
import { deleteProject, getTask, updateProject } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { projectPageHref } from '@/lib/project-route';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { TEMPLATES, createBlankTemplate, type Template } from './templates';
import { cn } from '@/lib/utils';

type View = 'list' | 'grid' | 'table';
const VIEWS: readonly View[] = ['list', 'grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.projects.view';
const TEMPLATES_STORAGE_KEY = 'midnite.templates';

type Tab = 'projects' | 'templates';
const TABS: readonly Tab[] = ['projects', 'templates'];

export function ProjectsView({
  initial,
  tasks,
  repos = [],
  memories = [],
}: {
  initial: Project[];
  tasks: TaskSummary[];
  repos?: Repo[];
  memories?: Memory[];
}) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const tBoard = useTranslations('board');
  const toast = useToast();
  const [view, setView] = useState<View>('grid');
  const [tab, setTab] = useState<Tab>('projects');
  const [creating, setCreating] = useState(false);
  const [planProject, setPlanProject] = useState<Project | null>(null);
  // The "Add task" project-menu item (Tasks list + Projects tree) opens this,
  // seeded with the project it was opened from (undefined for Unassigned).
  const [newTask, setNewTask] = useState<{ projectId?: string; status?: Status } | null>(null);
  // The task list is now a lean TaskSummary[] (Phase 57 C), so the detail modal —
  // which needs the full Task (events/prompt) — fetches it by id when opened.
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  useEffect(() => {
    if (!selectedTaskId) {
      setSelectedTask(null);
      return;
    }
    let cancelled = false;
    getTask(selectedTaskId)
      .then((t) => {
        if (!cancelled) setSelectedTask(t);
      })
      .catch(() => {
        if (!cancelled) setSelectedTaskId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTaskId]);
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
    const created = createBlankTemplate(t('templates.editor.untitled'));
    setTemplates((prev) => {
      const next = [created, ...prev];
      persistTemplates(next);
      return next;
    });
    // Open it for editing: the modal in card views, an expanded row in the table.
    if (view === 'table') setExpandTemplateId(created.id);
    else setOpenTemplateId(created.id);
  }, [persistTemplates, view, t]);

  const refresh = useCallback(() => invalidateData(), []);

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
      title: t('bulk.deleteConfirmTitle', { count: selectedIds.length }),
      description: t('bulk.deleteConfirmDescription'),
      confirmLabel: tCommon('delete'),
    });
    if (!ok) return;
    await Promise.all(selectedIds.map((id) => deleteProject(id)));
    clearSelection();
    refresh();
  }, [selectedIds, confirm, clearSelection, refresh, t, tCommon]);

  const deleteOneProject = useCallback(
    async (project: Project) => {
      const ok = await confirm({
        title: t('bulk.deleteOneTitle', { name: project.name }),
        description: t('bulk.deleteOneDescription'),
        confirmLabel: tCommon('delete'),
      });
      if (!ok) return;
      await deleteProject(project.id);
      refresh();
    },
    [confirm, refresh, t, tCommon],
  );

  const bulkActions = useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];
    const toArchive = selectedProjects.filter((p) => !p.archived).map((p) => p.id);
    const toUnarchive = selectedProjects.filter((p) => p.archived).map((p) => p.id);
    if (toArchive.length) {
      actions.push({
        key: 'archive',
        label: t('bulk.archive'),
        color: BULK_COLORS.archive,
        onClick: () => void setArchivedFor(toArchive, true),
      });
    }
    if (toUnarchive.length) {
      actions.push({
        key: 'unarchive',
        label: t('bulk.unarchive'),
        color: BULK_COLORS.archive,
        onClick: () => void setArchivedFor(toUnarchive, false),
      });
    }
    actions.push({
      key: 'delete',
      label: t('bulk.delete'),
      color: BULK_COLORS.delete,
      onClick: () => void deleteSelection(),
    });
    return actions;
  }, [selectedProjects, setArchivedFor, deleteSelection, t]);

  const closeModal = useCallback(() => setCreating(false), []);

  const searchParams = useSearchParams();
  const router = useRouter();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();

  const openProject = useCallback((p: Project) => router.push(projectPageHref(p.id)), [router]);

  // Deep-link: the legacy `/projects?open=<id>` (promoted-idea chips, old links)
  // now redirects to the standalone detail page (Phase 55 D). The page fetches by
  // id, so no need to wait for the list or match here.
  const openId = searchParams.get('open');
  useEffect(() => {
    if (openId) router.replace(projectPageHref(openId));
  }, [openId, router]);

  // Deep-link `/projects?new=1` (the titlebar filter's "New project" button)
  // opens the create modal, then strips the param so a reload doesn't reopen it.
  const openNew = searchParams.get('new');
  useEffect(() => {
    if (!openNew) return;
    setCreating(true);
    router.replace('/projects');
  }, [openNew, router]);
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
    <div className="space-y-4" data-tour="projects">
      <StickyToolbar className="reveal-controls">
        <div className="flex items-center gap-3">
          <CountPill count={count} />
          <div className="flex items-center gap-1.5">
            {TABS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  tab === value
                    ? 'border-foreground/20 bg-accent text-accent-foreground'
                    : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {t(`list.tabs.${value}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar placeholder={tCommon('searchProjects')} />
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('list.listView')}
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
              aria-label={t('list.gridView')}
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
              aria-label={t('list.treeView')}
              aria-pressed={view === 'table'}
              onClick={() => onSetView('table')}
              className={cn('h-7 w-7', view === 'table' && 'bg-accent text-accent-foreground')}
            >
              <ListTree className="h-4 w-4" />
            </Button>
          </div>
          {tab === 'projects' ? (
            <Button type="button" size="sm" onClick={() => setCreating(true)} data-tour="projects-new">
              <Plus className="h-4 w-4" />
              {tCommon('newProject')}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={newTemplate}>
              <Plus className="h-4 w-4" />
              {t('list.newTemplate')}
            </Button>
          )}
        </div>
      </StickyToolbar>

      {tab === 'projects' ? (
        <BulkActionBar count={selectedCount} actions={bulkActions} onClear={clearSelection} />
      ) : null}

      <div className="reveal-content">
        {tab === 'templates' ? (
          templates.length === 0 ? (
            <EmptyState
              Icon={FileText}
              title={t('list.emptyTemplatesTitle')}
              description={t('list.emptyTemplatesDescription')}
              actionLabel={t('list.newTemplate')}
              onAction={newTemplate}
            />
          ) : filteredTemplates.length === 0 ? (
            <EmptyState Icon={FileText} title={t('list.noTemplatesMatch', { query: q })} />
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
            title={t('list.emptyProjectsTitle')}
            description={t('list.emptyProjectsDescription')}
            actionLabel={tCommon('newProject')}
            onAction={() => setCreating(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState Icon={Folder} title={t('list.noProjectsMatch', { query: q })} />
        ) : view === 'table' ? (
          <ProjectsTree
            projects={filtered}
            tasks={tasks}
            onEdit={openProject}
            onPlan={setPlanProject}
            onDelete={(p) => void deleteOneProject(p)}
            onAddTask={(projectId, status) => setNewTask({ projectId, status })}
            onSelectTask={(t) => setSelectedTaskId(t.id)}
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
                onOpen={() => openProject(p)}
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
                onOpen={() => openProject(p)}
                onPlan={() => setPlanProject(p)}
                selected={isSelected(p.id)}
                onToggleSelect={() => toggleSelect(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* The modal is reserved for New (create); editing an existing project lives
          on its detail page (Phase 55 D). */}
      {creating ? (
        <ProjectModal
          project={null}
          memories={memories}
          templates={templates}
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
        <WorkItemModal
          origin={{ kind: 'task', task: selectedTask }}
          projects={initial}
          tasks={tasks}
          onClose={() => setSelectedTaskId(null)}
        />
      ) : null}

      {newTask ? (
        <NewTaskModal
          projects={initial}
          repos={repos}
          tasks={tasks}
          defaultProjectId={newTask.projectId}
          defaultStatus={newTask.status}
          onCreated={() => {
            toast.success(tBoard('toasts.taskCreated'));
            invalidateData();
          }}
          onBulkCreated={({ counts }) => {
            if (counts.created > 0) toast.success(tBoard('toasts.tasksCreated', { count: counts.created }));
            invalidateData();
          }}
          onClose={() => setNewTask(null)}
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
