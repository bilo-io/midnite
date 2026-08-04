'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderOpen, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { ExportMenu } from '@/components/export-menu';
import {
  createProject,
  deleteProject,
  enhanceProjectDescription,
  exportProjectMarkdown,
} from '@/lib/api';
import {
  MAX_TAG_LENGTH,
  type Memory,
  type Project,
  type TaskSummary,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FolderPicker } from '@/components/folder-picker';
import { DEFAULT_COLOR, TagColorPicker } from '@/components/tag-color-picker';
import { ProjectDetailsPanel } from '@/components/projects/panels/project-details-panel';
import { ProjectPlanPanel } from '@/components/projects/panels/project-plan-panel';
import { ProjectTasksPanel } from '@/components/projects/panels/project-tasks-panel';
import { TEMPLATES, type Template } from '@/app/(main)/projects/templates';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type Props = {
  /** Edit an existing project, or create a new one when null. */
  project: Project | null;
  /** Tasks belonging to this project (edit mode only) — shown under the Tasks tab. */
  tasks?: TaskSummary[];
  /** All memories — used to surface a link to this project's scoped memory. */
  memories?: Memory[];
  /** The template library, surfaced under the Plan tab. Defaults to the built-ins. */
  templates?: Template[];
  /** Optional: open a task from the Tasks tab. Rows are static when omitted. */
  onSelectTask?: (task: TaskSummary) => void;
  onClose: () => void;
  onSaved: () => void;
};

type Tab = 'details' | 'plan' | 'tasks';

/**
 * Create or edit a project. Edit mode delegates each tab to a self-contained
 * panel (`components/projects/panels/*`) shared with the detail page (Phase 55);
 * create mode keeps its staged, inline form since there's no project to mutate.
 */
export function ProjectModal({
  project,
  tasks,
  memories = [],
  templates = TEMPLATES,
  onSelectTask,
  onClose,
  onSaved,
}: Props) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const isEdit = project !== null;

  const [tab, setTab] = useState<Tab>('details');
  // Create-mode draft state (edit mode's details live inside ProjectDetailsPanel).
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [tag, setTag] = useState(project?.tag ?? '');
  const [color, setColor] = useState(project?.color ?? DEFAULT_COLOR);
  const [workDir, setWorkDir] = useState(project?.workDir ?? '');
  const [picking, setPicking] = useState(false);
  // The plan panel's nested doc editor owns Escape while open (see guard below).
  const [planDocOpen, setPlanDocOpen] = useState(false);
  const current = project;

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While a nested layer is open it owns Escape (and closes itself).
      if (e.key === 'Escape' && !picking && !planDocOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, picking, planDocOpen]);

  const taskCount = tasks?.length ?? 0;
  // Planning and Tasks only make sense for an existing project.
  const tabs: Tab[] = isEdit ? ['details', 'plan', 'tasks'] : ['details'];
  const tabCounts: Partial<Record<Tab, number>> = { tasks: taskCount };
  const tagTooLong = tag.trim().length > MAX_TAG_LENGTH;
  const canSave = name.trim().length > 0 && tag.trim().length > 0 && !tagTooLong;

  const errMsg = useCallback(
    (e: unknown): string => (e instanceof Error ? e.message : tCommon('errorTitle')),
    [tCommon],
  );

  const enhance = async () => {
    if (!description.trim()) {
      setError(t('form.writeDescriptionFirst'));
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      setDescription(await enhanceProjectDescription({ name: name.trim() || undefined, description }));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setAiLoading(false);
    }
  };

  // Create-only: edit-mode saves live inside ProjectDetailsPanel.
  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        tag: tag.trim(),
        color,
        workDir: workDir.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!current) return;
    const ok = await confirm({
      title: t('modal.deleteConfirmTitle'),
      description: t('modal.deleteConfirmDescription', { name: current.name }),
      confirmLabel: t('modal.deleteConfirmLabel'),
    });
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProject(current.id);
      onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEdit ? t('modal.editTitle') : tCommon('newProject')}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{isEdit ? t('modal.editTitle') : tCommon('newProject')}</h2>
            <div className="flex items-center gap-1">
              {isEdit && project ? (
                <ExportMenu
                  filename={`${(project.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`}
                  title={project.name}
                  fetchMarkdown={() => exportProjectMarkdown(project.id)}
                />
              ) : null}
              <Button type="button" variant="ghost" size="icon" aria-label={tCommon('close')} onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div role="tablist" aria-label={t('detail.sectionsAria')} className="flex items-center gap-1 border-b border-border/60 px-3">
            {tabs.map((value) => {
              const count = tabCounts[value];
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={cn(
                    'relative px-3 py-2 text-xs font-medium transition-colors',
                    tab === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {value === 'plan' ? t('detail.tabs.docs') : t(`detail.tabs.${value}`)}
                  {count ? (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  ) : null}
                  {tab === value ? (
                    <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Details */}
            <div role="tabpanel" className={cn(tab === 'details' ? '' : 'hidden')}>
              {isEdit && current ? (
                <ProjectDetailsPanel
                  project={current}
                  memories={memories}
                  onSaved={onSaved}
                  onAfterNavigate={onClose}
                />
              ) : (
                <div className="space-y-5">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="project-name" className="text-xs font-medium text-muted-foreground">
                      {t('form.title')}
                    </label>
                    <input
                      id="project-name"
                      className={inputClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('form.titlePlaceholder')}
                      autoFocus
                    />
                  </div>

                  {/* Description + AI */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="project-description" className="text-xs font-medium text-muted-foreground">
                        {t('form.description')}
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={enhance}
                        disabled={aiLoading}
                        aria-label={t('form.improveWithAi')}
                        className="h-7 gap-1.5 text-xs"
                      >
                        {aiLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {t('form.improveWithAi')}
                      </Button>
                    </div>
                    <Textarea
                      id="project-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('form.descriptionPlaceholder')}
                      rows={4}
                    />
                  </div>

                  {/* Tag + color */}
                  <div className="space-y-1.5">
                    <TagColorPicker
                      tag={tag}
                      color={color}
                      onTagChange={setTag}
                      onColorChange={setColor}
                      tagInputId="project-tag"
                      label={
                        <label htmlFor="project-tag" className="text-xs font-medium text-muted-foreground">
                          {t('form.tagAndColour')}
                        </label>
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">{t('form.tagHint', { max: MAX_TAG_LENGTH })}</p>
                  </div>

                  {/* Work directory */}
                  <div className="space-y-1.5">
                    <label htmlFor="project-workdir" className="text-xs font-medium text-muted-foreground">
                      {t('form.workDir')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="project-workdir"
                        className={cn(inputClass, 'flex-1 font-mono text-xs')}
                        value={workDir}
                        onChange={(e) => setWorkDir(e.target.value)}
                        placeholder={t('form.workDirPlaceholder')}
                        spellCheck={false}
                      />
                      {workDir.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t('form.clearWorkDir')}
                          onClick={() => setWorkDir('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        onClick={() => setPicking(true)}
                      >
                        <FolderOpen className="h-4 w-4" />
                        {t('form.browse')}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t('form.workDirHint')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Plan (edit only) */}
            {isEdit && current ? (
              <div role="tabpanel" className={cn(tab === 'plan' ? '' : 'hidden')}>
                <ProjectPlanPanel project={current} templates={templates} onDocOpenChange={setPlanDocOpen} />
              </div>
            ) : null}

            {/* Tasks (edit only) */}
            {isEdit ? (
              <div role="tabpanel" className={cn(tab === 'tasks' ? '' : 'hidden')}>
                <ProjectTasksPanel tasks={tasks ?? []} onSelectTask={onSelectTask} />
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
            <div>
              {isEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove()}
                  disabled={saving}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {tCommon('delete')}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                {isEdit ? tCommon('close') : tCommon('cancel')}
              </Button>
              {isEdit ? null : (
                <Button type="button" size="sm" onClick={() => void submit()} disabled={!canSave || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t('modal.createProject')}
                </Button>
              )}
            </div>
          </footer>
        </div>
      </div>

      {picking ? (
        <FolderPicker
          initialPath={workDir.trim() || undefined}
          onSelect={setWorkDir}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </>
  );
}
