'use client';

import { useState } from 'react';
import { Brain, Loader2, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MAX_SOURCES_PER_MEMORY, detectSourceKind, type Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/markdown-editor';
import { SourceListEditor } from '@/components/source-list-editor';
import { GLOBAL, MemoryScopeSelect, scopeToProjectId } from '@/components/memory/memory-scope';
import { createMemory } from '@/lib/api';

type Props = {
  projects: Project[];
  /** Preselect a scope when creating (a project id, or null for global). */
  initialProjectId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Create a new memory (Phase 65 A): title, scope (global or a project), markdown
 * content, and staged reference sources. Editing an existing memory happens on
 * its workspace page (`/memory/view?id=`) — the modal is reserved for creation.
 */
export function MemoryModal({ projects, initialProjectId, onClose, onSaved }: Props) {
  const t = useTranslations('memory');
  const tCommon = useTranslations('common');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<string>(initialProjectId ?? GLOBAL);
  const [content, setContent] = useState('');
  // Source URLs are staged until the memory exists, then added on create.
  const [staged, setStaged] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError(t('list.modal.titleRequired'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createMemory({ title, content, projectId: scopeToProjectId(scope), sources: staged });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon('errorTitle'));
      setBusy(false);
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
          aria-label={t('list.newMemory')}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <Brain className="h-4 w-4 shrink-0 text-[hsl(262_83%_66%)]" />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label={t('list.modal.titleLabel')}
              placeholder={t('list.modal.titlePlaceholder')}
              className="h-8 flex-1 border-transparent bg-transparent px-1.5 text-sm font-semibold hover:border-border/60 focus-visible:border-foreground/20"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tCommon('close')}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t('list.modal.scope')}
              </span>
              <MemoryScopeSelect projects={projects} value={scope} onChange={setScope} />
            </label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              minHeight={140}
              defaultMode="edit"
              label={
                <span className="text-xs font-medium text-muted-foreground">
                  {t('list.modal.content')}
                </span>
              }
              ariaLabel={t('list.modal.contentLabel')}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t('list.modal.sources')}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {staged.length}/{MAX_SOURCES_PER_MEMORY}
                </span>
              </div>
              <SourceListEditor
                sources={staged.map((url) => ({ id: url, url, kind: detectSourceKind(url) }))}
                max={MAX_SOURCES_PER_MEMORY}
                placeholder={t('list.modal.sourcePlaceholder')}
                onAdd={(url) => {
                  if (!staged.includes(url)) setStaged((prev) => [...prev, url]);
                }}
                onRemove={(id) => setStaged((prev) => prev.filter((u) => u !== id))}
                onReorder={(ids) => setStaged(ids)}
              />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
            <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('list.modal.create')}
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
