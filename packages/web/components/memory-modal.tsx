'use client';

import { useState } from 'react';
import { Brain, Loader2, Save, Trash2, X } from 'lucide-react';
import {
  MAX_SOURCES_PER_MEMORY,
  detectSourceKind,
  type Memory,
  type Project,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { MarkdownEditor } from '@/components/markdown-editor';
import { SourceListEditor, orderByIds } from '@/components/source-list-editor';
import { useConfirm } from '@/components/confirm-dialog';
import {
  addMemorySource,
  createMemory,
  deleteMemory,
  removeMemorySource,
  reorderMemorySources,
  updateMemory,
} from '@/lib/api';

// The scope select needs a string value; 'global' stands in for projectId null.
const GLOBAL = 'global';

type Props = {
  /** null = create a new memory. */
  memory: Memory | null;
  projects: Project[];
  /** Preselect a scope when creating (a project id, or null for global). */
  initialProjectId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * The memory detail view: edit the title, scope (global or a project), the
 * markdown content, and reference sources. Title/scope/content save on the
 * button; sources save live in edit mode and stage client-side when creating.
 */
export function MemoryModal({ memory, projects, initialProjectId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(memory?.title ?? '');
  const [scope, setScope] = useState<string>(memory?.projectId ?? initialProjectId ?? GLOBAL);
  const [content, setContent] = useState(memory?.content ?? '');
  // Edit mode tracks the live memory so source edits reflect immediately;
  // create mode stages source URLs until the memory exists.
  const [current, setCurrent] = useState<Memory | null>(memory);
  const [staged, setStaged] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const scopeOptions: SelectOption<string>[] = [
    {
      value: GLOBAL,
      label: 'Global — every project',
      icon: <Brain className="h-4 w-4 text-[hsl(262_83%_66%)]" />,
    },
    ...projects.map((p) => ({
      value: p.id,
      label: p.name,
      icon: (
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: p.color }}
        />
      ),
    })),
  ];

  const dirty =
    memory === null ||
    title !== memory.title ||
    content !== memory.content ||
    scope !== (memory.projectId ?? GLOBAL);

  const save = async () => {
    if (!title.trim()) {
      setError('Give this memory a title.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const projectId = scope === GLOBAL ? null : scope;
      if (memory) await updateMemory(memory.id, { title, content, projectId });
      else await createMemory({ title, content, projectId, sources: staged });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!memory) return;
    const ok = await confirm({
      title: 'Delete this memory?',
      description: `“${memory.title}” will no longer be available to your agents.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setError(null);
    setBusy(true);
    try {
      await deleteMemory(memory.id);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  // --- sources (live in edit mode, staged when creating) ---
  const addSourceLive = async (url: string) => {
    if (current) setCurrent(await addMemorySource(current.id, url));
  };
  const removeSourceLive = async (id: string) => {
    if (!current) return;
    const ok = await confirm({
      title: 'Remove this source?',
      description: 'It will be detached from this memory.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    setCurrent(await removeMemorySource(current.id, id));
  };
  const reorderSourcesLive = async (ids: string[]) => {
    if (!current) return;
    const prev = current;
    setCurrent({ ...prev, sources: orderByIds(prev.sources, ids) }); // optimistic
    try {
      setCurrent(await reorderMemorySources(prev.id, ids));
    } catch (e) {
      setCurrent(prev); // roll back
      throw e;
    }
  };

  const sourceCount = memory ? current?.sources.length ?? 0 : staged.length;

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
          aria-label={memory ? `${memory.title} memory` : 'New memory'}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <Brain className="h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]" />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Memory title"
              placeholder="Untitled memory"
              className="h-8 flex-1 border-transparent bg-transparent px-1.5 text-sm font-semibold hover:border-border/60 focus-visible:border-foreground/20"
            />
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Scope</span>
              <Select
                options={scopeOptions}
                value={scope}
                onChange={setScope}
                aria-label="Memory scope"
              />
            </label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              minHeight={280}
              defaultMode={memory ? 'preview' : 'edit'}
              label={<span className="text-xs font-medium text-muted-foreground">Content</span>}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Sources</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {sourceCount}/{MAX_SOURCES_PER_MEMORY}
                </span>
              </div>
              {memory ? (
                <SourceListEditor
                  sources={current?.sources ?? []}
                  max={MAX_SOURCES_PER_MEMORY}
                  placeholder="Paste a doc, repo, or any reference link"
                  onAdd={addSourceLive}
                  onRemove={removeSourceLive}
                  onReorder={reorderSourcesLive}
                />
              ) : (
                <SourceListEditor
                  sources={staged.map((url) => ({ id: url, url, kind: detectSourceKind(url) }))}
                  max={MAX_SOURCES_PER_MEMORY}
                  placeholder="Paste a doc, repo, or any reference link"
                  onAdd={(url) => {
                    if (!staged.includes(url)) setStaged((prev) => [...prev, url]);
                  }}
                  onRemove={(id) => setStaged((prev) => prev.filter((u) => u !== id))}
                  onReorder={(ids) => setStaged(ids)}
                />
              )}
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
            {memory ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void remove()}
                disabled={busy}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" size="sm" onClick={() => void save()} disabled={busy || !dirty}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {memory ? 'Save' : 'Create'}
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
