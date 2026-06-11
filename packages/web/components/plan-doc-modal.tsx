'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/markdown-editor';
import { ProjectTag } from '@/components/project-tag';
import type { PlanDoc } from '@/app/(main)/projects/planning';

type Props = {
  doc: PlanDoc;
  onSave: (patch: Partial<PlanDoc>) => void;
  onDelete: () => void;
  onClose: () => void;
};

/**
 * Opens a planning document for reading and editing. It's a project-scoped copy
 * of a template, so changes here never touch the source template — they're
 * saved back to the project's own document set.
 */
export function PlanDocModal({ doc, onSave, onDelete, onClose }: Props) {
  const [content, setContent] = useState(doc.content);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dirty = content !== doc.content;

  const save = () => {
    onSave({ content });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
          aria-label={`${doc.name} document`}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <ProjectTag tag={doc.tag} color={doc.color} />
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{doc.name}</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              minHeight={320}
              label={<span className="text-xs font-medium text-muted-foreground">Document</span>}
            />
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy markdown'}
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={!dirty && !saved}>
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
