'use client';

import { useState, type KeyboardEvent } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { createBulk, createTask } from '@/lib/api';
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
          message:
            `Added ${counts.created} task${counts.created === 1 ? '' : 's'}` +
            (counts.failed > 0 ? ` · ${counts.failed} failed` : ''),
        });
      } else {
        const form = new FormData();
        form.append('prompt', trimmed);
        form.append('status', 'todo');
        form.append('priority', '1');
        const { task } = await createTask(form);
        setFeedback({ kind: 'ok', message: `Added “${task.title}”` });
      }
      setText('');
      invalidateData();
    } catch (err) {
      setFeedback({
        kind: 'err',
        message: err instanceof Error ? err.message : 'Failed to add task',
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
      title="Quick capture"
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
          Bulk
        </button>
      }
      bodyClassName="flex flex-col gap-2 p-3"
    >
      <Textarea
        aria-label={bulk ? 'Tasks (one per line)' : 'Task'}
        placeholder={
          bulk ? 'One task per line…\nfix the login bug\nwrite the docs' : 'Add a task…'
        }
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
              {bulk ? 'One task per line' : '⌘↵ to add'}
            </span>
          )}
        </span>
        <Button type="button" size="sm" onClick={() => void submit()} disabled={!canSubmit}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : 'Add'}
        </Button>
      </div>
    </WidgetCard>
  );
}
