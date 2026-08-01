'use client';

import { useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type Memory, type Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/markdown-editor';
import { useConfirm } from '@/components/confirm-dialog';
import { deleteMemory, updateMemory } from '@/lib/api';
import { MemoryScopeSelect, scopeToProjectId, scopeValue } from './memory-scope';

/**
 * The workspace's center doc panel (Phase 65 A): edit an existing memory's
 * title, scope and markdown content, saved explicitly when dirty — parity with
 * the modal's edit flow, which the modal no longer carries (it's create-only).
 * Delete lives here too. Sources are edited separately (the left rail).
 */
export function MemoryDocPanel({
  memory,
  projects,
  onSaved,
  onDeleted,
}: {
  memory: Memory;
  projects: Project[];
  /** Called with the updated memory after a successful save. */
  onSaved: (memory: Memory) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations('memory');
  const tCommon = useTranslations('common');
  const confirm = useConfirm();
  const [title, setTitle] = useState(memory.title);
  const [scope, setScope] = useState<string>(scopeValue(memory.projectId));
  const [content, setContent] = useState(memory.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    title !== memory.title ||
    content !== memory.content ||
    scope !== scopeValue(memory.projectId);

  const save = async () => {
    if (!title.trim()) {
      setError(t('doc.titleRequired'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const updated = await updateMemory(memory.id, {
        title,
        content,
        projectId: scopeToProjectId(scope),
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon('errorTitle'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('doc.deleteTitle'),
      description: t('doc.deleteDescription', { title: memory.title }),
      confirmLabel: tCommon('delete'),
    });
    if (!ok) return;
    setError(null);
    setBusy(true);
    try {
      await deleteMemory(memory.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon('errorTitle'));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label={t('doc.titleLabel')}
        placeholder={t('doc.titlePlaceholder')}
        className="h-9 text-sm font-semibold"
      />
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t('doc.scopeLabel')}</span>
        <MemoryScopeSelect projects={projects} value={scope} onChange={setScope} />
      </label>
      <MarkdownEditor
        value={content}
        onChange={setContent}
        minHeight={220}
        defaultMode={content ? 'preview' : 'edit'}
        label={
          <span className="text-xs font-medium text-muted-foreground">{t('doc.contentLabel')}</span>
        }
        ariaLabel={t('doc.contentAriaLabel')}
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void remove()}
          disabled={busy}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {tCommon('delete')}
        </Button>
        <Button type="button" size="sm" onClick={() => void save()} disabled={busy || !dirty}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {tCommon('save')}
        </Button>
      </div>
    </div>
  );
}
