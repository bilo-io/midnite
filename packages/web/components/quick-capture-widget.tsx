'use client';

import { useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, PlusCircle } from 'lucide-react';
import { createBulk, createTask } from '@/lib/api';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import { invalidateData } from '@/lib/data-refresh';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

type Feedback = { kind: 'ok' | 'err'; message: string };

/**
 * Quick-capture widget (Phase 7 Theme C): add a task straight from the dashboard
 * without opening the new-task modal. **Single** mode posts one task; **bulk**
 * mode fans a pasted multi-line blob through `POST /tasks/bulk` (outstanding #2).
 * Everything else is left to the normal pipeline — status defaults to `todo` (the
 * planner triages it), the repo is inferred (PR #88) — so capture stays one field
 * + Add. The board refreshes off the task WS broadcast; we also `invalidateData()`
 * for immediacy. `⌘/Ctrl+↵` submits.
 */
export function QuickCaptureWidget() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const widgetLabels = useWidgetLabels();
  const [text, setText] = useState('');
  const [bulk, setBulk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setFeedback(null);
    try {
      if (bulk) {
        const { counts } = await createBulk({ raw: text });
        setFeedback({
          kind: counts.created > 0 ? 'ok' : 'err',
          // Two whole messages rather than a base plus an appended failure clause: the
          // plural rule for `created` and where the failure count sits are both the
          // translator's call, and ICU can only decide that inside one message.
          message:
            counts.failed > 0
              ? t('quickCapture.addedWithFailures', { count: counts.created, failed: counts.failed })
              : t('quickCapture.added', { count: counts.created }),
        });
      } else {
        const form = new FormData();
        form.append('prompt', trimmed);
        form.append('status', 'todo');
        form.append('priority', '1');
        const { task } = await createTask(form);
        setFeedback({ kind: 'ok', message: t('quickCapture.addedOne', { title: task.title }) });
      }
      setText('');
      invalidateData();
    } catch (err) {
      setFeedback({
        kind: 'err',
        message: err instanceof Error ? err.message : t('quickCapture.error'),
      });
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <WidgetCard
      title={widgetLabels.label('quick-capture')}
      icon={PlusCircle}
      actions={
        <button
          type="button"
          onClick={() => setBulk((b) => !b)}
          aria-pressed={bulk}
          className={cn(
            'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
            bulk
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {t('quickCapture.bulk')}
        </button>
      }
      bodyClassName="flex flex-col gap-2 p-3"
    >
      <Textarea
        aria-label={bulk ? t('quickCapture.ariaBulk') : t('quickCapture.ariaSingle')}
        placeholder={bulk ? t('quickCapture.placeholderBulk') : t('quickCapture.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        className="min-h-0 flex-1 resize-none text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'min-w-0 truncate text-xs',
            feedback?.kind === 'err' ? 'text-destructive' : 'text-muted-foreground',
          )}
          role={feedback?.kind === 'err' ? 'alert' : undefined}
        >
          {feedback?.message ?? (
            <span className="hidden sm:inline">
              {bulk ? t('quickCapture.hintBulk') : t('quickCapture.hint')}
            </span>
          )}
        </span>
        <Button type="button" size="sm" onClick={() => void submit()} disabled={!canSubmit}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : tCommon('add')}
        </Button>
      </div>
    </WidgetCard>
  );
}
