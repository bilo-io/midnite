'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import {
  MAX_SOURCES_PER_PROJECT,
  MAX_TAG_LENGTH,
  detectSourceKind,
  type Project,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ProjectTag } from '@/components/project-tag';
import { SourceIcon } from '@/components/source-icon';
import {
  addProjectSource,
  createProject,
  deleteProject,
  enhanceProjectDescription,
  removeProjectSource,
  updateProject,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const SWATCHES = [
  '#6366f1',
  '#7c3aed',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#64748b',
];
const DEFAULT_COLOR = '#6366f1';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

type Props = {
  /** Edit an existing project, or create a new one when null. */
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ProjectModal({ project, onClose, onSaved }: Props) {
  const isEdit = project !== null;

  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [tag, setTag] = useState(project?.tag ?? '');
  const [color, setColor] = useState(project?.color ?? DEFAULT_COLOR);
  // Create mode stages URLs client-side; edit mode mutates the live project.
  const [staged, setStaged] = useState<string[]>([]);
  const [current, setCurrent] = useState<Project | null>(project);
  const [sourceUrl, setSourceUrl] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sourceCount = isEdit ? current?.sources.length ?? 0 : staged.length;
  const atLimit = sourceCount >= MAX_SOURCES_PER_PROJECT;
  const tagTooLong = tag.trim().length > MAX_TAG_LENGTH;
  const canSave = name.trim().length > 0 && tag.trim().length > 0 && !tagTooLong;

  const addSource = async () => {
    const url = sourceUrl.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      setError('Enter a full URL, including https://');
      return;
    }
    if (atLimit) {
      setError(`Up to ${MAX_SOURCES_PER_PROJECT} sources per project`);
      return;
    }
    setError(null);

    if (isEdit && current) {
      setSourceBusy(true);
      try {
        setCurrent(await addProjectSource(current.id, url));
        setSourceUrl('');
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setSourceBusy(false);
      }
    } else {
      if (!staged.includes(url)) setStaged((prev) => [...prev, url]);
      setSourceUrl('');
    }
  };

  const removeExisting = async (sourceId: string) => {
    if (!current) return;
    setSourceBusy(true);
    try {
      setCurrent(await removeProjectSource(current.id, sourceId));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSourceBusy(false);
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
        });
      } else {
        await createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          tag: tag.trim(),
          color,
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

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
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
              <label htmlFor="project-tag" className="text-xs font-medium text-muted-foreground">
                Tag &amp; color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="project-tag"
                  className={cn(inputClass, 'flex-1', tagTooLong && 'border-destructive')}
                  value={tag}
                  maxLength={MAX_TAG_LENGTH}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="short-tag"
                />
                <input
                  type="color"
                  aria-label="Project color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
                />
                <ProjectTag tag={tag.trim() || 'tag'} color={color} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SWATCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-label={`Use color ${s}`}
                    onClick={() => setColor(s)}
                    className={cn(
                      'h-5 w-5 rounded-full border transition-transform hover:scale-110',
                      color.toLowerCase() === s ? 'ring-2 ring-ring ring-offset-1 ring-offset-card' : '',
                    )}
                    style={{ backgroundColor: s }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Max {MAX_TAG_LENGTH} characters. Tasks in this project carry this tag.
              </p>
            </div>

            {/* Sources */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="project-source" className="text-xs font-medium text-muted-foreground">
                  Sources
                </label>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {sourceCount}/{MAX_SOURCES_PER_PROJECT}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="project-source"
                  className={inputClass}
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void addSource();
                    }
                  }}
                  placeholder="Paste a Google Docs, Notion, or YouTube link"
                  disabled={atLimit || sourceBusy}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => void addSource()}
                  disabled={atLimit || sourceBusy || !sourceUrl.trim()}
                  aria-label="Add source"
                >
                  {sourceBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <ul className="space-y-1.5">
                {isEdit
                  ? (current?.sources ?? []).map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5"
                      >
                        <SourceIcon kind={s.kind} faviconUrl={s.faviconUrl} />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {s.title ?? s.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeExisting(s.id)}
                          disabled={sourceBusy}
                          aria-label="Remove source"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))
                  : staged.map((url) => (
                      <li
                        key={url}
                        className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5"
                      >
                        <SourceIcon kind={detectSourceKind(url)} />
                        <span className="min-w-0 flex-1 truncate text-sm">{url}</span>
                        <button
                          type="button"
                          onClick={() => setStaged((prev) => prev.filter((u) => u !== url))}
                          aria-label="Remove source"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
              </ul>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
            <div>
              {isEdit ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Delete?</span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void remove()}
                      disabled={saving}
                    >
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )
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
    </>
  );
}
