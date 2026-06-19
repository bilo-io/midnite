'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  MAX_SOURCES_PER_PROJECT,
  MAX_TAG_LENGTH,
  detectSourceKind,
  type Memory,
  type Project,
  type Task,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FolderPicker } from '@/components/folder-picker';
import { ProjectTag } from '@/components/project-tag';
import { DEFAULT_COLOR, TagColorPicker } from '@/components/tag-color-picker';
import { SourceListEditor, orderByIds } from '@/components/source-list-editor';
import { TaskRow } from '@/components/task-row';
import { PlanDocModal } from '@/components/plan-doc-modal';
import { TEMPLATES, type Template } from '@/app/(main)/projects/templates';
import {
  createDocFromTemplate,
  loadPlanDocs,
  savePlanDocs,
  type PlanDoc,
} from '@/app/(main)/projects/planning';
import {
  addProjectSource,
  createProject,
  deleteProject,
  enhanceProjectDescription,
  removeProjectSource,
  reorderProjectSources,
  updateProject,
} from '@/lib/api';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

type Props = {
  /** Edit an existing project, or create a new one when null. */
  project: Project | null;
  /** Tasks belonging to this project (edit mode only) — shown under the Tasks tab. */
  tasks?: Task[];
  /** All memories — used to surface a link to this project's scoped memory. */
  memories?: Memory[];
  /** The template library, surfaced under the Plan tab. Defaults to the built-ins. */
  templates?: Template[];
  /** Optional: open a task from the Tasks tab. Rows are static when omitted. */
  onSelectTask?: (task: Task) => void;
  onClose: () => void;
  onSaved: () => void;
};

type Tab = 'details' | 'sources' | 'plan' | 'tasks';

export function ProjectModal({
  project,
  tasks,
  memories = [],
  templates = TEMPLATES,
  onSelectTask,
  onClose,
  onSaved,
}: Props) {
  const isEdit = project !== null;
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('details');
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [tag, setTag] = useState(project?.tag ?? '');
  const [color, setColor] = useState(project?.color ?? DEFAULT_COLOR);
  const [workDir, setWorkDir] = useState(project?.workDir ?? '');
  const [picking, setPicking] = useState(false);
  // Create mode stages URLs client-side; edit mode mutates the live project.
  const [staged, setStaged] = useState<string[]>([]);
  const [current, setCurrent] = useState<Project | null>(project);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  // Planning documents are a project-scoped copy of templates, persisted
  // client-side keyed by project id (edit mode only).
  const [docs, setDocs] = useState<PlanDoc[]>([]);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addRect, setAddRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project) setDocs(loadPlanDocs(project.id));
  }, [project]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While a nested layer is open it owns Escape (and closes itself).
      if (e.key === 'Escape' && !picking && !openDocId) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, picking, openDocId]);

  const placeAddMenu = useCallback(() => {
    const el = addRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAddRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    placeAddMenu();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (addRef.current?.contains(t) || addMenuRef.current?.contains(t)) return;
      setAddOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setAddOpen(false);
      }
    };
    window.addEventListener('scroll', placeAddMenu, true);
    window.addEventListener('resize', placeAddMenu);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('scroll', placeAddMenu, true);
      window.removeEventListener('resize', placeAddMenu);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [addOpen, placeAddMenu]);

  const persistDocs = useCallback(
    (next: PlanDoc[]) => {
      setDocs(next);
      if (project) savePlanDocs(project.id, next);
    },
    [project],
  );

  const addDoc = useCallback(
    (template: Template) => {
      const doc = createDocFromTemplate(template, name.trim() || project?.name || 'this project');
      persistDocs([...docs, doc]);
      setAddOpen(false);
      setOpenDocId(doc.id);
    },
    [docs, name, persistDocs, project],
  );

  const removeDoc = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: 'Remove this document?',
        description: 'It will be deleted from this project. The source template is unchanged.',
        confirmLabel: 'Remove',
      });
      if (!ok) return;
      persistDocs(docs.filter((d) => d.id !== id));
      setOpenDocId((cur) => (cur === id ? null : cur));
    },
    [confirm, docs, persistDocs],
  );

  // Templates that don't yet have a document in this project.
  const availableTemplates = templates.filter(
    (t) => !docs.some((d) => d.templateId === t.id),
  );
  const openDoc = docs.find((d) => d.id === openDocId) ?? null;

  const sourceCount = isEdit ? current?.sources.length ?? 0 : staged.length;
  const taskCount = tasks?.length ?? 0;
  // Planning and Tasks only make sense for an existing project.
  const tabs: Tab[] = isEdit
    ? ['details', 'sources', 'plan', 'tasks']
    : ['details', 'sources'];
  const tabCounts: Partial<Record<Tab, number>> = {
    sources: sourceCount,
    plan: docs.length,
    tasks: taskCount,
  };
  const tagTooLong = tag.trim().length > MAX_TAG_LENGTH;
  const canSave = name.trim().length > 0 && tag.trim().length > 0 && !tagTooLong;

  // The project's own memory (if it has one); otherwise we offer to create one.
  const projectMemories = isEdit ? memories.filter((m) => m.projectId === project!.id) : [];

  // Sources: edit mode mutates the live project; create mode stages URLs. The
  // SourceListEditor surfaces its own add/reorder errors.
  const addSourceLive = async (url: string) => {
    if (current) setCurrent(await addProjectSource(current.id, url));
  };
  const removeSourceLive = async (id: string) => {
    if (!current) return;
    const ok = await confirm({
      title: 'Remove this source?',
      description: 'It will be detached from this project.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    setCurrent(await removeProjectSource(current.id, id));
  };
  const reorderSourcesLive = async (ids: string[]) => {
    if (!current) return;
    const prev = current;
    setCurrent({ ...prev, sources: orderByIds(prev.sources, ids) }); // optimistic
    try {
      setCurrent(await reorderProjectSources(prev.id, ids));
    } catch (e) {
      setCurrent(prev); // roll back
      throw e;
    }
  };

  const enhance = async () => {
    if (!description.trim()) {
      setError('Write a short description first, then improve it with AI');
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const improved = await enhanceProjectDescription({
        name: name.trim() || undefined,
        description,
      });
      setDescription(improved);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit && current) {
        await updateProject(current.id, {
          name: name.trim(),
          description: description.trim(),
          tag: tag.trim(),
          color,
          workDir: workDir.trim(),
        });
      } else {
        await createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          tag: tag.trim(),
          color,
          workDir: workDir.trim() || undefined,
          sources: staged,
        });
      }
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
      title: 'Delete this project?',
      description: `“${current.name}” and its sources will be permanently deleted. This can’t be undone.`,
      confirmLabel: 'Delete project',
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
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEdit ? 'Edit project' : 'New project'}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{isEdit ? 'Edit project' : 'New project'}</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div role="tablist" aria-label="Project sections" className="flex items-center gap-1 border-b border-border/60 px-3">
            {tabs.map((t) => {
              const count = tabCounts[t];
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'relative px-3 py-2 text-xs font-medium capitalize transition-colors',
                    tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t}
                  {count ? (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  ) : null}
                  {tab === t ? (
                    <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Details */}
            <div role="tabpanel" className={cn('space-y-5', tab === 'details' ? '' : 'hidden')}>
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="project-name" className="text-xs font-medium text-muted-foreground">
                Title
              </label>
              <input
                id="project-name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Billing revamp"
                autoFocus
              />
            </div>

            {/* Description + AI */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="project-description"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Description
                </label>
                <div className="group/ai relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={enhance}
                    disabled={aiLoading}
                    aria-label="Improve with AI"
                    className="h-7 gap-1.5 text-xs"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Improve with AI
                  </Button>
                </div>
              </div>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
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
                  <label
                    htmlFor="project-tag"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Tag &amp; color
                  </label>
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Max {MAX_TAG_LENGTH} characters. Tasks in this project carry this tag.
              </p>
            </div>

            {/* Work directory */}
            <div className="space-y-1.5">
              <label htmlFor="project-workdir" className="text-xs font-medium text-muted-foreground">
                Work directory
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="project-workdir"
                  className={cn(inputClass, 'flex-1 font-mono text-xs')}
                  value={workDir}
                  onChange={(e) => setWorkDir(e.target.value)}
                  placeholder="~/Dev/my-project"
                  spellCheck={false}
                />
                {workDir.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Clear work directory"
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
                  Browse
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Where this project&apos;s agent sessions spawn. Leave blank to use the default.
              </p>
            </div>

            {/* Project memory — jump to (or create) this project's scoped memory. */}
            {isEdit ? (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Project memory</span>
                <button
                  type="button"
                  onClick={() => {
                    router.push(
                      projectMemories.length
                        ? `/memory?scope=${encodeURIComponent(project!.id)}`
                        : `/memory?create=${encodeURIComponent(project!.id)}`,
                    );
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-2 text-left text-sm transition-colors hover:border-foreground/20 hover:bg-accent/40"
                >
                  <Brain className="h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]" />
                  <span className="min-w-0 flex-1 truncate">
                    {projectMemories.length
                      ? `View ${projectMemories.length} memor${
                          projectMemories.length === 1 ? 'y' : 'ies'
                        }`
                      : 'Create a memory for this project'}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <p className="text-[11px] text-muted-foreground">
                  Knowledge entries scoped to this project, injected into agent prompts.
                </p>
              </div>
            ) : null}
            </div>

            {/* Sources */}
            <div role="tabpanel" className={cn('space-y-2', tab === 'sources' ? '' : 'hidden')}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Sources</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {sourceCount}/{MAX_SOURCES_PER_PROJECT}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Reference links for this project — drag the grip to reorder. Included when drafting a
                plan.
              </p>
              {isEdit ? (
                <SourceListEditor
                  sources={current?.sources ?? []}
                  max={MAX_SOURCES_PER_PROJECT}
                  placeholder="Paste a Google Docs, Notion, or YouTube link"
                  onAdd={addSourceLive}
                  onRemove={removeSourceLive}
                  onReorder={reorderSourcesLive}
                />
              ) : (
                <SourceListEditor
                  sources={staged.map((url) => ({ id: url, url, kind: detectSourceKind(url) }))}
                  max={MAX_SOURCES_PER_PROJECT}
                  placeholder="Paste a Google Docs, Notion, or YouTube link"
                  onAdd={(url) => {
                    if (!staged.includes(url)) setStaged((prev) => [...prev, url]);
                  }}
                  onRemove={(id) => setStaged((prev) => prev.filter((u) => u !== id))}
                  onReorder={(ids) => setStaged(ids)}
                />
              )}
            </div>

            {/* Plan */}
            {isEdit ? (
              <div role="tabpanel" className={cn('space-y-3', tab === 'plan' ? '' : 'hidden')}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Documents</label>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {docs.length} doc{docs.length === 1 ? '' : 's'}
                  </span>
                </div>

                {docs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    No planning documents yet. Add one from the template library to draft a spec or
                    plan for this project.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {docs.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5"
                      >
                        <ProjectTag tag={d.tag} color={d.color} />
                        <button
                          type="button"
                          onClick={() => setOpenDocId(d.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:text-foreground"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{d.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeDoc(d.id)}
                          aria-label="Remove document"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div>
                  <Button
                    ref={addRef}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setAddOpen((v) => !v)}
                    disabled={availableTemplates.length === 0}
                    aria-haspopup="listbox"
                    aria-expanded={addOpen}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Add document
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', addOpen && 'rotate-180')}
                    />
                  </Button>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {availableTemplates.length === 0
                      ? 'Every template already has a document in this project.'
                      : 'Documents are copied from the template library and titled for this project.'}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Tasks */}
            {isEdit ? (
              <div role="tabpanel" className={cn('space-y-2', tab === 'tasks' ? '' : 'hidden')}>
                {taskCount === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                    No tasks in this project yet.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border bg-card">
                    {(tasks ?? []).map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        onSelect={onSelectTask ? () => onSelectTask(t) : undefined}
                        showStatus
                      />
                    ))}
                  </div>
                )}
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
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void submit()}
                disabled={!canSave || saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isEdit ? 'Save' : 'Create project'}
              </Button>
            </div>
          </footer>
        </div>
      </div>

      {addOpen && addRect
        ? createPortal(
            <div
              ref={addMenuRef}
              role="listbox"
              aria-label="Templates"
              style={{
                position: 'fixed',
                top: addRect.top,
                left: addRect.left,
                minWidth: Math.max(addRect.width, 224),
              }}
              className="z-[60] max-h-72 w-64 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg"
            >
              {availableTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => addDoc(t)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                >
                  <ProjectTag tag={t.tag} color={t.color} />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}

      {openDoc ? (
        <PlanDocModal
          doc={openDoc}
          onSave={(patch) =>
            persistDocs(docs.map((d) => (d.id === openDoc.id ? { ...d, ...patch } : d)))
          }
          onDelete={() => void removeDoc(openDoc.id)}
          onClose={() => setOpenDocId(null)}
        />
      ) : null}

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
