'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import type { PrDiff } from '@midnite/shared';
import { getPrDiff } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { Button } from '@/components/ui/button';
import { PrDiffViewer } from './pr-diff-viewer';

type Props = {
  taskId: string;
  prUrl: string;
};

type State =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; diff: PrDiff };

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Failed to load the diff';
}

/**
 * Fetches a task's PR diff and renders the review viewer, with fail-open loading /
 * error / ready states (retry + "Open on GitHub" escape hatch). Chrome-free so it
 * embeds in both the full-screen modal (board quick-peek) and the task-detail
 * Review tab (Phase 52 Theme E). Fills its container (`h-full`).
 */
export function PrReviewPanel({ taskId, prUrl }: Props) {
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

  if (state.phase === 'loading') {
    return (
      <div className="flex h-full min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading diff…
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 px-6 text-center">
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
    );
  }

  return (
    <PrDiffViewer
      diff={state.diff}
      taskId={taskId}
      onActionComplete={() => {
        // A submitted review / merge changes pr_status + task state — refresh the
        // board and any open task views. Re-fetch the diff too (merge may close it).
        invalidateData();
        load();
      }}
    />
  );
}
