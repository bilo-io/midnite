'use client';

import { useEffect, useState } from 'react';
import { Check, Save, X } from 'lucide-react';
import type { Council } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/markdown-editor';

type Props = {
  council: Council;
  onSave: (customPrompt: string) => void | Promise<void>;
  onClose: () => void;
};

/**
 * Edits a council's reusable `customPrompt` — the synthesis task used whenever a
 * run's format is "Custom". Backdrop + dialog structure mirror TemplateModal; the
 * body is a markdown editor opened in edit mode.
 */
export function CouncilCustomFormatModal({ council, onSave, onClose }: Props) {
  const [text, setText] = useState(council.customPrompt ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(text);
      setSaved(true);
      onClose();
    } finally {
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
          aria-label="Custom synthesis prompt"
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">Custom synthesis prompt</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <p className="text-xs leading-snug text-muted-foreground">
              This prompt is used as the synthesis task whenever a run&apos;s format is Custom.
            </p>
            <MarkdownEditor
              value={text}
              onChange={setText}
              minHeight={320}
              defaultMode="edit"
              label={
                <span className="text-xs font-medium text-muted-foreground">
                  Prompt for {council.name}
                </span>
              }
            />
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
