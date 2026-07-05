'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Columns2, Rows2, UnfoldVertical, FoldVertical, X } from 'lucide-react';
import { getChangeKey, type ChangeData, type EventMap, type ViewType } from 'react-diff-view';
import type { PrDiff, PrReviewComment, Task } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DiffFile } from './diff-file';
import { DiffFileTree } from './diff-file-tree';
import { mapDiffFiles } from './diff-model';
import { PrReviewActions } from './pr-review-actions';

import 'react-diff-view/style/index.css';
import './diff-theme.css';

/** react-diff-view's diff side (not re-exported from its barrel). */
type DiffSide = 'old' | 'new';

const VIEW_TYPE_KEY = 'midnite:pr-diff-view-type';

type ExpandState = 'initial' | 'all' | 'none';

/** A pending inline comment plus the diff change-key it anchors to. */
type DraftComment = PrReviewComment & { changeKey: string };

type Props = {
  diff: PrDiff;
  /** When set, the viewer is a review surface: gutter-click adds inline comments
   *  and a review/merge action bar renders (Phase 52 C). Absent = read-only. */
  taskId?: string;
  /** Called with the re-hydrated task after a review/merge succeeds. */
  onActionComplete?: (task: Task) => void;
};

/** Where a clicked change anchors a GitHub review comment (line + side). */
function anchorFor(change: ChangeData, side: DiffSide | undefined): { line: number; side: 'LEFT' | 'RIGHT' } | null {
  // LEFT = old file (deletions), RIGHT = new file (additions/context). Unified
  // view has no `side`, so derive from the change kind (comment the new version).
  const onLeft = side === 'old' || (side === undefined && change.type === 'delete');
  const line = onLeft
    ? (change as { oldLineNumber?: number; lineNumber?: number }).oldLineNumber ??
      (change as { lineNumber?: number }).lineNumber
    : (change as { newLineNumber?: number; lineNumber?: number }).newLineNumber ??
      (change as { lineNumber?: number }).lineNumber;
  if (typeof line !== 'number') return null;
  return { line, side: onLeft ? 'LEFT' : 'RIGHT' };
}

/**
 * The in-app PR diff review surface (Phase 52 Theme B): a file-tree/list rail +
 * a syntax-highlighted split/unified diff. Files collapse by default and mount
 * their hunks lazily, so a large diff stays responsive; truncated diffs surface
 * the hidden-file count rather than silently cutting (Decision §6).
 */
export function PrDiffViewer({ diff, taskId, onActionComplete }: Props) {
  const [viewType, setViewType] = useLocalStorage<ViewType>(VIEW_TYPE_KEY, 'unified');
  const [expand, setExpand] = useState<ExpandState>('initial');
  // Bump to remount files when "expand/collapse all" flips their default open state.
  const [expandSignal, setExpandSignal] = useState(0);

  const reviewable = !!taskId;
  // Inline review comments (Phase 52 C), keyed per file path; drafts live here
  // until the review is submitted (draft *persistence* across reloads is Theme D).
  const [drafts, setDrafts] = useState<Record<string, DraftComment[]>>({});
  const [composer, setComposer] = useState<{ path: string; changeKey: string; line: number; side: 'LEFT' | 'RIGHT' } | null>(null);

  const mapped = useMemo(() => mapDiffFiles(diff.files), [diff.files]);

  const setAll = (next: ExpandState) => {
    setExpand(next);
    setExpandSignal((n) => n + 1);
  };

  const isOpen = (index: number): boolean =>
    expand === 'all' ? true : expand === 'none' ? false : index === 0;

  const allComments: PrReviewComment[] = Object.values(drafts)
    .flat()
    .map(({ path, line, side, body }) => ({ path, line, side, body }));

  const openComposer = (path: string) => (change: ChangeData, side: DiffSide | undefined) => {
    const anchor = anchorFor(change, side);
    if (!anchor) return;
    setComposer({ path, changeKey: getChangeKey(change), line: anchor.line, side: anchor.side });
  };

  const addDraft = (body: string) => {
    if (!composer || !body.trim()) return;
    const draft: DraftComment = {
      path: composer.path,
      line: composer.line,
      side: composer.side,
      body: body.trim(),
      changeKey: composer.changeKey,
    };
    setDrafts((prev) => ({ ...prev, [composer.path]: [...(prev[composer.path] ?? []), draft] }));
    setComposer(null);
  };

  const removeDraft = (path: string, index: number) =>
    setDrafts((prev) => ({ ...prev, [path]: (prev[path] ?? []).filter((_, i) => i !== index) }));

  // react-diff-view widgets for one file: a card per anchored change key listing
  // its saved drafts, plus the open composer when it targets this file.
  const widgetsFor = (path: string): Record<string, ReactNode> => {
    if (!reviewable) return {};
    const widgets: Record<string, ReactNode> = {};
    const byKey = new Map<string, { draft: DraftComment; index: number }[]>();
    (drafts[path] ?? []).forEach((draft, index) => {
      const list = byKey.get(draft.changeKey) ?? [];
      list.push({ draft, index });
      byKey.set(draft.changeKey, list);
    });
    for (const [changeKey, list] of byKey) {
      widgets[changeKey] = (
        <div className="space-y-1 border-y border-border/60 bg-muted/30 px-3 py-2">
          {list.map(({ draft, index }) => (
            <div key={index} className="flex items-start gap-2 text-xs">
              <span className="min-w-0 flex-1 whitespace-pre-wrap">{draft.body}</span>
              <button
                type="button"
                aria-label="Remove comment"
                onClick={() => removeDraft(path, index)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      );
    }
    if (composer?.path === path) {
      widgets[composer.changeKey] = (
        <InlineComposer onAdd={addDraft} onCancel={() => setComposer(null)} existing={widgets[composer.changeKey]} />
      );
    }
    return widgets;
  };

  const gutterEventsFor = (path: string): EventMap | undefined =>
    reviewable ? { onClick: (args) => args.change && openComposer(path)(args.change, args.side) } : undefined;

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
                <DiffFile
                  key={`${m.key}-${expandSignal}`}
                  mapped={m}
                  viewType={viewType}
                  defaultOpen={isOpen(i)}
                  widgets={widgetsFor(m.file.path)}
                  gutterEvents={gutterEventsFor(m.file.path)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {reviewable && taskId ? (
        <PrReviewActions
          taskId={taskId}
          comments={allComments}
          onClearComments={() => setDrafts({})}
          onDone={(task) => onActionComplete?.(task)}
        />
      ) : null}
    </div>
  );
}

/** A tiny inline-comment composer rendered as a react-diff-view line widget. */
function InlineComposer({
  onAdd,
  onCancel,
  existing,
}: {
  onAdd: (body: string) => void;
  onCancel: () => void;
  existing?: ReactNode;
}) {
  const [body, setBody] = useState('');
  return (
    <div className="border-y border-border/60 bg-muted/30 px-3 py-2">
      {existing}
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add an inline comment…"
        rows={2}
        className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="mt-1 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onAdd(body)}
          disabled={!body.trim()}
          className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
        >
          Add comment
        </button>
      </div>
    </div>
  );
}
