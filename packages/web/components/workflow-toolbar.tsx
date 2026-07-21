'use client';

import { BookmarkPlus, History, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TriggerBadge } from '@/components/trigger-badge';
import { describeCron } from '@/lib/cron';
import { useWorkflowStore } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

/**
 * The workflow editor's command bar. The trigger sits on the far left (it names
 * how the workflow fires); the run / enable / save controls cluster on the right.
 * The workflow's identity (back link, editable title + description) lives above
 * in the shared `PageHeader` (`WorkflowPageHeader`), not here.
 */
export function WorkflowToolbar({
  onRun,
  onSave,
  onEditTrigger,
  onHistory,
  onSaveAsTemplate,
  historyOpen,
  running,
  saving,
}: {
  onRun: () => void;
  onSave: () => void;
  onEditTrigger: () => void;
  onHistory: () => void;
  onSaveAsTemplate?: () => void;
  historyOpen: boolean;
  running: boolean;
  saving: boolean;
}) {
  const enabled = useWorkflowStore((s) => s.enabled);
  const setEnabled = useWorkflowStore((s) => s.setEnabled);
  const trigger = useWorkflowStore((s) => s.trigger);
  const dirty = useWorkflowStore((s) => s.dirty);

  const triggerLabel =
    trigger.type === 'schedule'
      ? describeCron(trigger.cron)
      : trigger.type === 'webhook'
        ? 'Runs on a webhook'
        : trigger.type === 'task-event'
          ? 'Runs on a task event'
          : 'Runs on demand';

  return (
    <header className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-2 backdrop-blur">
      {/* Trigger — far left, since it names how the workflow fires. */}
      <button
        type="button"
        onClick={onEditTrigger}
        title="Change trigger"
        aria-label="Change trigger"
        className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 transition-colors hover:border-border hover:bg-accent/40"
      >
        <TriggerBadge type={trigger.type} />
        <span className="text-xs text-muted-foreground">{triggerLabel}</span>
      </button>

      <div className="ml-auto flex items-center gap-3">
        {onSaveAsTemplate ? (
          <button
            type="button"
            onClick={onSaveAsTemplate}
            aria-label="Save as template"
            title="Save as template"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <BookmarkPlus className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onHistory}
          aria-label="Run history"
          aria-pressed={historyOpen}
          title="Run history"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            historyOpen ? 'border-border bg-muted text-foreground' : 'border-transparent',
          )}
        >
          <History className="h-4 w-4" />
        </button>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enabled" />
          Enabled
        </label>
        <Button type="button" size="sm" onClick={onRun} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run
        </Button>
        {/* Autosave status — edits persist on their own; the button is the manual escape hatch. */}
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
        <Button type="button" size="sm" variant="secondary" onClick={onSave} disabled={!dirty || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {dirty ? 'Save' : 'Saved'}
        </Button>
      </div>
    </header>
  );
}
