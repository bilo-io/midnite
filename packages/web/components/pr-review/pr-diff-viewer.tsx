'use client';

import { useMemo, useState } from 'react';
import { Columns2, Rows2, UnfoldVertical, FoldVertical } from 'lucide-react';
import type { ViewType } from 'react-diff-view';
import type { PrDiff } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DiffFile } from './diff-file';
import { DiffFileTree } from './diff-file-tree';
import { mapDiffFiles } from './diff-model';

import 'react-diff-view/style/index.css';
import './diff-theme.css';

const VIEW_TYPE_KEY = 'midnite:pr-diff-view-type';

type ExpandState = 'initial' | 'all' | 'none';

type Props = {
  diff: PrDiff;
};

/**
 * The in-app PR diff review surface (Phase 52 Theme B): a file-tree/list rail +
 * a syntax-highlighted split/unified diff. Files collapse by default and mount
 * their hunks lazily, so a large diff stays responsive; truncated diffs surface
 * the hidden-file count rather than silently cutting (Decision §6).
 */
export function PrDiffViewer({ diff }: Props) {
  const [viewType, setViewType] = useLocalStorage<ViewType>(VIEW_TYPE_KEY, 'unified');
  const [expand, setExpand] = useState<ExpandState>('initial');
  // Bump to remount files when "expand/collapse all" flips their default open state.
  const [expandSignal, setExpandSignal] = useState(0);

  const mapped = useMemo(() => mapDiffFiles(diff.files), [diff.files]);

  const setAll = (next: ExpandState) => {
    setExpand(next);
    setExpandSignal((n) => n + 1);
  };

  const isOpen = (index: number): boolean =>
    expand === 'all' ? true : expand === 'none' ? false : index === 0;

  return (
    <div className="pr-diff-viewer flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{diff.files.length}</span> file
          {diff.files.length === 1 ? '' : 's'} changed
          {' · '}
          <span className="text-success">+{diff.additions}</span>{' '}
          <span className="text-destructive-foreground">−{diff.deletions}</span>
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAll(expand === 'all' ? 'none' : 'all')}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            {expand === 'all' ? <FoldVertical className="h-3.5 w-3.5" /> : <UnfoldVertical className="h-3.5 w-3.5" />}
            {expand === 'all' ? 'Collapse all' : 'Expand all'}
          </button>

          <div className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5" role="group" aria-label="Diff layout">
            <button
              type="button"
              onClick={() => setViewType('unified')}
              aria-pressed={viewType === 'unified'}
              aria-label="Unified view"
              className={cn(
                'rounded px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground',
                viewType === 'unified' && 'bg-background text-foreground shadow-sm',
              )}
            >
              <Rows2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewType('split')}
              aria-pressed={viewType === 'split'}
              aria-label="Split view"
              className={cn(
                'rounded px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground',
                viewType === 'split' && 'bg-background text-foreground shadow-sm',
              )}
            >
              <Columns2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {diff.truncated ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          Diff truncated to fit — {diff.hiddenFileCount} file
          {diff.hiddenFileCount === 1 ? '' : 's'} not shown. Open the PR on GitHub to see everything.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* File rail — a drawer/hidden on narrow screens; the diff is the priority there. */}
        <aside className="hidden w-64 shrink-0 border-r border-border/60 md:block">
          <DiffFileTree files={diff.files} hiddenFiles={diff.hiddenFiles} onJump={() => undefined} />
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
          {mapped.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No files in this diff.</p>
          ) : (
            <div className="space-y-3">
              {mapped.map((m, i) => (
                <DiffFile key={`${m.key}-${expandSignal}`} mapped={m} viewType={viewType} defaultOpen={isOpen(i)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
