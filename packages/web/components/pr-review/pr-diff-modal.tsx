'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ExternalLink, Loader2, X } from 'lucide-react';
import type { PrDiff } from '@midnite/shared';
import { getPrDiff } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PrDiffViewer } from './pr-diff-viewer';

type Props = {
  taskId: string;
  prUrl: string;
  onClose: () => void;
};

type State =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; diff: PrDiff };

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Failed to load the diff';
}

/**
 * Full-screen modal that fetches a task's PR diff and renders the review viewer.
 * Fail-open like the PR poller: a fetch/auth failure shows a banner with a retry
 * + an "Open on GitHub" escape hatch, never a broken view.
 */
export function PrDiffModal({ taskId, prUrl, onClose }: Props) {
  const [state, setState] = useState<State>({ phase: 'loading' });

  const load = useCallback(
    (signal?: AbortSignal) => {
      setState({ phase: 'loading' });
      getPrDiff(taskId, signal)
        .then((diff) => {
          if (!signal?.aborted) setState({ phase: 'ready', diff });
        })
        .catch((e: unknown) => {
          if (!signal?.aborted) setState({ phase: 'error', message: errMsg(e) });
        });
    },
    [taskId],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

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
              Open PR <ExternalLink className="h-3 w-3" />
            </a>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          {state.phase === 'loading' ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading diff…
            </div>
          ) : state.phase === 'error' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <p className="text-sm text-muted-foreground">Couldn&apos;t load the diff: {state.message}</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => load()}>
                  Retry
                </Button>
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Open on GitHub <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1">
              <PrDiffViewer diff={state.diff} />
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
