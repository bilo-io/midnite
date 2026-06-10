'use client';

import * as React from 'react';
import { Inbox, ListChecks, Loader2, Send, Trash2, X } from 'lucide-react';
import type { Status } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createTask } from '@/lib/api';
import { draftTasks, type FeatureDraft } from '@/lib/feature-drafts';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

type Props = {
  draft: FeatureDraft;
  /** Images carried over from the composer for this draft (in-memory, this session). */
  images?: File[];
  onClose: () => void;
  /** Persist edits to the draft as the user types. */
  onChange: (patch: Partial<Pick<FeatureDraft, 'name' | 'text'>>) => void;
  /** Discard the draft entirely. */
  onDelete: () => void;
  /** Tasks were crafted from this draft — parent removes it and refreshes. */
  onCommitted: (status: Status) => void;
};

/**
 * Edit a parked feature-list request and, when ready, craft it into tasks.
 * "Craft tasks" reveals a follow-up choice: park them in the Backlog or queue
 * them in Todo (where the agent pool picks them up as slots free).
 */
export function FeatureListModal({
  draft,
  images = [],
  onClose,
  onChange,
  onDelete,
  onCommitted,
}: Props) {
  const [name, setName] = React.useState(draft.name);
  const [text, setText] = React.useState(draft.text);
  const [choosing, setChoosing] = React.useState(false);
  const [busy, setBusy] = React.useState<Status | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const tasks = draftTasks(text);
  const taskCount = tasks.length;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (choosing) setChoosing(false);
      else if (!busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, choosing, busy]);

  // Persist edits to the parent store (debounced-ish: on blur / unmount is
  // overkill here — the store is cheap, so mirror on every change).
  const setNameAndStore = (v: string) => {
    setName(v);
    onChange({ name: v.trim() || 'Untitled idea' });
  };
  const setTextAndStore = (v: string) => {
    setText(v);
    onChange({ text: v });
  };

  const commit = async (status: Status) => {
    if (taskCount === 0 || busy) return;
    setBusy(status);
    setError(null);
    try {
      // Images (if any were carried from the composer) attach to the first task.
      await Promise.all(
        tasks.map((prompt, idx) => {
          const form = new FormData();
          form.append('prompt', prompt);
          form.append('status', status);
          if (draft.projectId) form.append('projectId', draft.projectId);
          if (idx === 0) {
            for (const file of images) form.append('images', file, file.name);
          }
          return createTask(form);
        }),
      );
      onCommitted(status);
    } catch (e) {
      setError(errMsg(e));
      setBusy(null);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={busy ? undefined : onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit feature list request"
          className="pointer-events-auto relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">Feature list request</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={onClose}
              disabled={!!busy}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <label htmlFor="draft-name" className="text-xs font-medium text-muted-foreground">
                Name
              </label>
              <input
                id="draft-name"
                className={inputClass}
                value={name}
                onChange={(e) => setNameAndStore(e.target.value)}
                placeholder="e.g. Billing revamp"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="draft-text" className="text-xs font-medium text-muted-foreground">
                  Tasks
                </label>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <Textarea
                id="draft-text"
                value={text}
                onChange={(e) => setTextAndStore(e.target.value)}
                placeholder="Describe the work — one task per line."
                rows={8}
              />
              <p className="text-[11px] text-muted-foreground">
                Each non-empty line becomes its own task when you craft this list.
              </p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Discard?</span>
                <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
                  Confirm
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Discard
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => setChoosing(true)}
              disabled={taskCount === 0 || !!busy}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              Craft {taskCount > 1 ? `${taskCount} tasks` : 'task'}
            </Button>
          </footer>

          {/* Follow-up: where should these tasks land? */}
          {choosing ? (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/80 p-4 backdrop-blur-sm"
              onClick={() => !busy && setChoosing(false)}
            >
              <div
                className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-sm font-semibold">Where should these go?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'} from “{name}”.
                </p>
                <div className="mt-4 grid gap-2">
                  <ChoiceButton
                    icon={<ListChecks className="h-4 w-4" />}
                    title="Todo"
                    detail="Queue now — agents pick these up as slots free."
                    loading={busy === 'todo'}
                    disabled={!!busy}
                    onClick={() => void commit('todo')}
                  />
                  <ChoiceButton
                    icon={<Inbox className="h-4 w-4" />}
                    title="Backlog"
                    detail="Park for later — nothing starts until you move them."
                    loading={busy === 'backlog'}
                    disabled={!!busy}
                    onClick={() => void commit('backlog')}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setChoosing(false)}
                  disabled={!!busy}
                  className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ChoiceButton({
  icon,
  title,
  detail,
  loading,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-start gap-3 rounded-md border border-border/70 bg-background/60 p-3 text-left transition-colors',
        'hover:border-border hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      <span className="mt-0.5 text-muted-foreground">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}
