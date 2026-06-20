'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, FileText, NotebookPen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { ProjectTag } from '@/components/project-tag';
import type { BoardroomDoc } from '@/lib/office/documents';

/**
 * Read-only viewer for a board-room document (a project plan or a scoped memory),
 * rendered with the app's normal MarkdownPreview. Layered above the board-room
 * panel (z-[80]); Escape / backdrop / × close it.
 */
export function DocumentModal({ doc, onClose }: { doc: BoardroomDoc; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context / permissions) — no-op.
    }
  };

  const Icon = doc.kind === 'plan' ? FileText : NotebookPen;

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-background/50 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${doc.title} document`}
          className="animate-dialog-in pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <ProjectTag tag={doc.tag} color={doc.color} />
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{doc.title}</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {doc.content.trim() ? (
              <MarkdownPreview content={doc.content} />
            ) : (
              <p className="text-sm text-muted-foreground">This document is empty.</p>
            )}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {doc.kind === 'plan' ? 'Project plan' : 'Memory'} · {doc.projectName}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy markdown'}
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
