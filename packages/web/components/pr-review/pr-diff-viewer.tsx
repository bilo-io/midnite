'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Columns2, MessageSquare, Rows2, UnfoldVertical, FoldVertical, X, XCircle } from 'lucide-react';
import { getChangeKey, type ChangeData, type EventMap, type HunkData, type ViewType } from 'react-diff-view';
import type { PrDiff, PrReviewDraft, Task } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/use-local-storage';
import { createPrDraft, deletePrDraft, listPrDrafts, updatePrDraft } from '@/lib/api';
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

type Props = {
  diff: PrDiff;
  /** When set, the viewer is a review surface: gutter-click adds persisted inline
   *  comments and a review/merge action bar renders (Phase 52 C/D). Absent = read-only. */
  taskId?: string;
  /** Called with the re-hydrated task after a review/merge succeeds. */
  onActionComplete?: (task: Task) => void;
};

/** Where a clicked change anchors a GitHub review comment (line + side). */
function anchorFor(change: ChangeData, side: DiffSide | undefined): { line: number; side: 'LEFT' | 'RIGHT' } | null {
  const onLeft = side === 'old' || (side === undefined && change.type === 'delete');
  const line = onLeft
    ? (change as { oldLineNumber?: number; lineNumber?: number }).oldLineNumber ??
      (change as { lineNumber?: number }).lineNumber
    : (change as { newLineNumber?: number; lineNumber?: number }).newLineNumber ??
      (change as { lineNumber?: number }).lineNumber;
  if (typeof line !== 'number') return null;
  return { line, side: onLeft ? 'LEFT' : 'RIGHT' };
}

/** Map a file's changes to `SIDE:line` → change-key, so a persisted draft (which
 *  stores only path/line/side) can be re-anchored to its react-diff-view widget. */
function keyIndex(hunks: HunkData[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const hunk of hunks) {
    for (const change of hunk.changes) {
      const key = getChangeKey(change);
      const c = change as { oldLineNumber?: number; newLineNumber?: number; lineNumber?: number; type: string };
      if (c.type === 'delete') idx.set(`LEFT:${c.lineNumber}`, key);
      else if (c.type === 'insert') idx.set(`RIGHT:${c.lineNumber}`, key);
      else {
        if (typeof c.oldLineNumber === 'number') idx.set(`LEFT:${c.oldLineNumber}`, key);
        if (typeof c.newLineNumber === 'number') idx.set(`RIGHT:${c.newLineNumber}`, key);
      }
    }
  }
  return idx;
}

/**
 * The in-app PR diff review surface (Phase 52). A file-tree/list rail + a
 * syntax-highlighted split/unified diff; in review mode (`taskId`) a gutter-click
 * inline-comment composer (persisted drafts, Theme D) + a review/merge action bar,
 * with the Phase 37 AI-review verdict surfaced as a banner.
 */
export function PrDiffViewer({ diff, taskId, onActionComplete }: Props) {
  const [viewType, setViewType] = useLocalStorage<ViewType>(VIEW_TYPE_KEY, 'unified');
  const [expand, setExpand] = useState<ExpandState>('initial');
  const [expandSignal, setExpandSignal] = useState(0);

  const reviewable = !!taskId;
  const [drafts, setDrafts] = useState<PrReviewDraft[]>([]);
  const [composer, setComposer] = useState<{ path: string; changeKey: string; line: number; side: 'LEFT' | 'RIGHT' } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const loadDrafts = useCallback(() => {
    if (!taskId) return;
    listPrDrafts(taskId)
      .then(setDrafts)
      .catch(() => undefined); // fail-soft: no drafts shown if the fetch fails
  }, [taskId]);
  useEffect(() => loadDrafts(), [loadDrafts]);

  const mapped = useMemo(() => mapDiffFiles(diff.files), [diff.files]);

  const setAll = (next: ExpandState) => {
    setExpand(next);
    setExpandSignal((n) => n + 1);
  };
  const isOpen = (index: number): boolean =>
    expand === 'all' ? true : expand === 'none' ? false : index === 0;

  const openComposer = (path: string) => (change: ChangeData, side: DiffSide | undefined) => {
    const anchor = anchorFor(change, side);
    if (!anchor) return;
    setComposer({ path, changeKey: getChangeKey(change), line: anchor.line, side: anchor.side });
  };

  const addDraft = async (body: string) => {
    if (!taskId || !composer || !body.trim()) return;
    const created = await createPrDraft(taskId, {
      path: composer.path,
      line: composer.line,
      side: composer.side,
      body: body.trim(),
    });
    setDrafts((prev) => [...prev, created]);
    setComposer(null);
  };

  const removeDraft = async (id: string) => {
    if (!taskId) return;
    await deletePrDraft(taskId, id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const saveEdit = async (id: string, body: string) => {
    if (!taskId || !body.trim()) return;
    const updated = await updatePrDraft(taskId, id, body.trim());
    setDrafts((prev) => prev.map((d) => (d.id === id ? updated : d)));
    setEditing(null);
  };

  // Widgets for one file: a card per anchored line listing its drafts (edit/delete)
  // + the open composer. Server drafts re-anchor to change-keys via the file's index.
  const widgetsFor = (path: string, hunks: HunkData[]): Record<string, ReactNode> => {
    if (!reviewable) return {};
    const idx = keyIndex(hunks);
    const widgets: Record<string, ReactNode> = {};
    const byKey = new Map<string, PrReviewDraft[]>();
    for (const d of drafts) {
      if (d.path !== path) continue;
      const key = idx.get(`${d.side}:${d.line}`);
      if (!key) continue; // the anchored line isn't in the (possibly truncated) hunks
      byKey.set(key, [...(byKey.get(key) ?? []), d]);
    }
    for (const [changeKey, list] of byKey) {
      widgets[changeKey] = (
        <div className="space-y-1.5 border-y border-border/60 bg-muted/30 px-3 py-2">
          {list.map((d) =>
            editing === d.id ? (
              <InlineComposer key={d.id} initial={d.body} onAdd={(b) => void saveEdit(d.id, b)} onCancel={() => setEditing(null)} />
            ) : (
              <div key={d.id} className="flex items-start gap-2 text-xs">
                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 whitespace-pre-wrap">{d.body}</span>
                <button type="button" onClick={() => setEditing(d.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  Edit
                </button>
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => void removeDraft(d.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ),
          )}
        </div>
      );
    }
    if (composer?.path === path && !widgets[composer.changeKey]) {
      widgets[composer.changeKey] = <InlineComposer onAdd={(b) => void addDraft(b)} onCancel={() => setComposer(null)} />;
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

      {diff.aiReview ? <AiReviewBanner review={diff.aiReview} /> : null}

      {diff.truncated ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          Diff truncated to fit — {diff.hiddenFileCount} file
          {diff.hiddenFileCount === 1 ? '' : 's'} not shown. Open the PR on GitHub to see everything.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
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
                  widgets={widgetsFor(m.file.path, m.hunks)}
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
          comments={drafts.map(({ path, line, side, body }) => ({ path, line, side, body }))}
          onClearComments={loadDrafts}
          onDone={(task) => onActionComplete?.(task)}
        />
      ) : null}
    </div>
  );
}

const AI_VERDICT: Record<'approved' | 'commented' | 'changes-requested', { label: string; cls: string; Icon: typeof Check }> = {
  approved: { label: 'AI: LGTM', cls: 'border-success/40 bg-success/10 text-success', Icon: Check },
  'changes-requested': {
    label: 'AI: changes requested',
    cls: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    Icon: XCircle,
  },
  commented: { label: 'AI: reviewed', cls: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300', Icon: MessageSquare },
};

/** Phase 52 D — the task's Phase 37 AI-review verdict + summary, atop the diff. */
function AiReviewBanner({ review }: { review: NonNullable<PrDiff['aiReview']> }) {
  const { label, cls, Icon } = AI_VERDICT[review.verdict];
  return (
    <div className={cn('flex items-start gap-2 border-b px-3 py-2 text-xs', cls)}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="font-semibold">{label}</span>
        {review.summary ? <p className="mt-0.5 whitespace-pre-wrap text-foreground/80">{review.summary}</p> : null}
      </div>
    </div>
  );
}

/** A tiny inline-comment composer rendered as a react-diff-view line widget. */
function InlineComposer({
  onAdd,
  onCancel,
  initial = '',
}: {
  onAdd: (body: string) => void;
  onCancel: () => void;
  initial?: string;
}) {
  const [body, setBody] = useState(initial);
  return (
    <div className="border-y border-border/60 bg-muted/30 px-3 py-2">
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add an inline comment…"
        rows={2}
        className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="mt-1 flex justify-end gap-1.5">
        <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onAdd(body)}
          disabled={!body.trim()}
          className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
        >
          Save comment
        </button>
      </div>
    </div>
  );
}
