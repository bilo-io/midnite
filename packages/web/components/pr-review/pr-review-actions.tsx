'use client';

import { useState } from 'react';
import { Check, GitMerge, MessageSquare, XCircle } from 'lucide-react';
import type { PrMergeMethod, PrReviewComment, PrReviewEvent, Task } from '@midnite/shared';
import { mergePr, submitPrReview } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

const EVENTS: { value: PrReviewEvent; label: string; Icon: typeof Check }[] = [
  { value: 'approve', label: 'Approve', Icon: Check },
  { value: 'request-changes', label: 'Request changes', Icon: XCircle },
  { value: 'comment', label: 'Comment', Icon: MessageSquare },
];
const METHODS: PrMergeMethod[] = ['squash', 'merge', 'rebase'];

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'GitHub request failed';
}

type Props = {
  taskId: string;
  /** Draft inline comments accumulated on the diff — submitted in the batch. */
  comments: PrReviewComment[];
  onClearComments: () => void;
  /** Called with the re-hydrated task after a successful review/merge. */
  onDone: (task: Task) => void;
};

/**
 * Phase 52 Theme C — the review write-back bar: pick an event (approve /
 * request-changes / comment), add a body, submit (batching any inline draft
 * comments), or merge the PR. Auth + guardrails live server-side; a GitHub
 * refusal (branch protection, unmergeable) surfaces as a toast.
 */
export function PrReviewActions({ taskId, comments, onClearComments, onDone }: Props) {
  const confirm = useConfirm();
  const toast = useToast();
  const [event, setEvent] = useState<PrReviewEvent>('comment');
  const [body, setBody] = useState('');
  const [method, setMethod] = useState<PrMergeMethod>('squash');
  const [busy, setBusy] = useState<null | 'review' | 'merge'>(null);

  const canSubmit = event === 'approve' || body.trim().length > 0 || comments.length > 0;

  const submit = async () => {
    setBusy('review');
    try {
      // Inline comments are the task's persisted drafts (server-sourced) — send only event + body.
      const task = await submitPrReview(taskId, { event, body: body.trim() || undefined });
      toast.success(
        event === 'approve' ? 'PR approved' : event === 'request-changes' ? 'Changes requested' : 'Review submitted',
      );
      setBody('');
      onClearComments();
      onDone(task);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const merge = async () => {
    const ok = await confirm({
      title: `Merge this PR (${method})?`,
      description: 'Merges on GitHub, honoring branch protection. This cannot be undone from midnite.',
      confirmLabel: 'Merge',
    });
    if (!ok) return;
    setBusy('merge');
    try {
      const task = await mergePr(taskId, method);
      toast.success('PR merged');
      onDone(task);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2 border-t border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5" role="group" aria-label="Review event">
          {EVENTS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setEvent(value)}
              aria-pressed={event === value}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground',
                event === value && 'bg-background text-foreground shadow-sm',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        {comments.length > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {comments.length} inline comment{comments.length === 1 ? '' : 's'} pending
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          <select
            aria-label="Merge method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PrMergeMethod)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            onClick={() => void merge()}
            className="h-8 gap-1.5"
          >
            <GitMerge className="h-3.5 w-3.5" /> Merge
          </Button>
        </div>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={event === 'approve' ? 'Optional approval note…' : 'Leave a review comment…'}
        rows={2}
        className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={busy !== null || !canSubmit}
          onClick={() => void submit()}
          className="h-8 gap-1.5"
        >
          <Check className="h-3.5 w-3.5" /> Submit review
        </Button>
      </div>
    </div>
  );
}
