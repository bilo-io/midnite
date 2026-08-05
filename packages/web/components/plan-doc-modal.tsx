'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, Save, Sparkles, Trash2, X } from 'lucide-react';
import type { ProjectDoc } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/markdown-editor';
import { useTranslations } from 'next-intl';
import { ProjectTag } from '@/components/project-tag';

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

type Props = {
  doc: ProjectDoc;
  onSave: (patch: { name?: string; content?: string }) => Promise<void>;
  onDelete: () => void;
  onClose: () => void;
  /** Fill in the doc's content via Claude; resolves with the updated doc. */
  onGenerate: () => Promise<ProjectDoc>;
};

/**
 * Opens a planning document for reading and editing. It's a project-scoped copy
 * of a template, so changes here never touch the source template — they're
 * saved back to the project's own document set (persisted by the gateway).
 */
export function PlanDocModal({ doc, onSave, onDelete, onClose, onGenerate }: Props) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const [content, setContent] = useState(doc.content);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dirty = content !== doc.content;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ content });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(errMsg(e, t('plan.genericError')));
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const updated = await onGenerate();
      setContent(updated.content);
    } catch (e) {
      setError(errMsg(e, t('plan.genericError')));
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context, permissions) — no-op.
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('plan.doc.dialogLabel', { name: doc.name })}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <ProjectTag tag={doc.tag} color={doc.color} />
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{doc.name}</h2>
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

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              minHeight={320}
              label={
                <span className="text-xs font-medium text-muted-foreground">
                  {t('plan.doc.editorLabel')}
                </span>
              }
            />
          </div>

          {error ? <p className="px-5 pb-2 text-sm text-destructive">{error}</p> : null}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {tCommon('delete')}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void generate()}
                disabled={generating || saving}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? t('plan.doc.generating') : t('plan.doc.generate')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t('plan.doc.copied') : t('plan.doc.copyMarkdown')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void save()}
                disabled={saving || generating || (!dirty && !saved)}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? tCommon('saving') : saved ? tCommon('saved') : tCommon('save')}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
