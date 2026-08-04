'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, GitMerge, MessageSquare, XCircle } from 'lucide-react';
import type { PrMergeMethod, PrReviewComment, PrReviewEvent, Task } from '@midnite/shared';
import { mergePr, submitPrReview } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';
import { useMergeMethodLabel, useReviewEventLabel } from '@/lib/i18n-labels';
import { cn } from '@/lib/utils';

const EVENTS: { value: PrReviewEvent; Icon: typeof Check }[] = [
  { value: 'approve', Icon: Check },
  { value: 'request-changes', Icon: XCircle },
  { value: 'comment', Icon: MessageSquare },
];
const METHODS: PrMergeMethod[] = ['squash', 'merge', 'rebase'];

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
  const t = useTranslations('prReview');
  const eventLabel = useReviewEventLabel();
  const mergeMethodLabel = useMergeMethodLabel();
  const confirm = useConfirm();
  const toast = useToast();
  const [event, setEvent] = useState<PrReviewEvent>('comment');
  const [body, setBody] = useState('');
  const [method, setMethod] = useState<PrMergeMethod>('squash');
  const [busy, setBusy] = useState<null | 'review' | 'merge'>(null);

  const canSubmit = event === 'approve' || body.trim().length > 0 || comments.length > 0;

  const errMsg = (e: unknown): string => (e instanceof Error ? e.message : t('actions.requestFailed'));

  const submit = async () => {
    setBusy('review');
    try {
      // Inline comments are the task's persisted drafts (server-sourced) — send only event + body.
      const task = await submitPrReview(taskId, { event, body: body.trim() || undefined });
      toast.success(
        event === 'approve'
          ? t('actions.toastApproved')
          : event === 'request-changes'
            ? t('actions.toastChangesRequested')
            : t('actions.toastSubmitted'),
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
      title: t('actions.mergeConfirmTitle', { method: mergeMethodLabel(method) }),
      description: t('actions.mergeConfirmDescription'),
      confirmLabel: t('actions.merge'),
    });
    if (!ok) return;
    setBusy('merge');
    try {
      const task = await mergePr(taskId, method);
      toast.success(t('actions.toastMerged'));
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
        <div
          className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5"
          role="group"
          aria-label={t('actions.eventGroup')}
        >
          {EVENTS.map(({ value, Icon }) => (
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
              {eventLabel(value)}
            </button>
          ))}
        </div>
        {comments.length > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {t('actions.pendingComments', { count: comments.length })}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          <select
            aria-label={t('actions.mergeMethod')}
            value={method}
            onChange={(e) => setMethod(e.target.value as PrMergeMethod)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {mergeMethodLabel(m)}
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
            <GitMerge className="h-3.5 w-3.5" /> {t('actions.merge')}
          </Button>
        </div>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          event === 'approve' ? t('actions.approvalNotePlaceholder') : t('actions.commentPlaceholder')
        }
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
          <Check className="h-3.5 w-3.5" /> {t('actions.submitReview')}
        </Button>
      </div>
    </div>
  );
}
