'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GithubIcon } from '@midnite/ui';
import { Button } from '@/components/ui/button';
import { PrReviewPanel } from './pr-review-panel';

type Props = {
  taskId: string;
  prUrl: string;
  onClose: () => void;
};

/**
 * Full-screen modal wrapper around {@link PrReviewPanel} for the board's quick
 * "View diff" peek (the task-detail Review tab embeds the panel inline instead).
 * Fail-open states live in the panel.
 */
export function PrDiffModal({ taskId, prUrl, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-background/50 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pull request diff"
          className="pointer-events-auto flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">Review changes</h2>
            <a
              href={prUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open PR <GithubIcon className="h-3 w-3" />
            </a>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="min-h-0 flex-1">
            <PrReviewPanel taskId={taskId} prUrl={prUrl} />
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
