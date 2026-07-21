'use client';

import { useState } from 'react';
import { BookmarkPlus, ChevronRight, History, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BackLink } from '@/components/back-link';
import { TriggerBadge } from '@/components/trigger-badge';
import { describeCron } from '@/lib/cron';
import { useWorkflowStore } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

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
  const name = useWorkflowStore((s) => s.name);
  const setName = useWorkflowStore((s) => s.setName);
  const description = useWorkflowStore((s) => s.description);
  const setDescription = useWorkflowStore((s) => s.setDescription);
  const enabled = useWorkflowStore((s) => s.enabled);
  const setEnabled = useWorkflowStore((s) => s.setEnabled);
  const trigger = useWorkflowStore((s) => s.trigger);
  const dirty = useWorkflowStore((s) => s.dirty);

  // Expand the header (revealing the description) by default when the workflow
  // already has one, so it isn't hidden behind the chevron on open.
  const [expanded, setExpanded] = useState(() => description.trim().length > 0);

  const triggerLabel =
    trigger.type === 'schedule'
      ? describeCron(trigger.cron)
      : trigger.type === 'webhook'
        ? 'Runs on a webhook'
        : trigger.type === 'task-event'
          ? 'Runs on a task event'
          : 'Runs on demand';

  return (
    <header className="flex flex-col gap-1.5 border-b border-border/60 bg-background/70 px-4 py-2.5 backdrop-blur">
      {/* Back affordance stacked above the title — the shared detail-view pattern
          (BackLink top-left, editable title below), mirroring PageHeader. */}
      <BackLink href="/workflows" label="All workflows" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((o) => !o)}
          aria-expanded={expanded}
          aria-controls="workflow-description"
          aria-label={expanded ? 'Hide description' : 'Show description'}
          title={expanded ? 'Hide description' : 'Show description'}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <ChevronRight
            className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', expanded && 'rotate-90')}
          />
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Workflow name"
          placeholder="Untitled workflow"
          className="h-8 w-72 rounded-md border border-transparent bg-transparent px-2 text-base font-semibold tracking-tight hover:border-border focus-visible:border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
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
      </div>

      {/* Editable description subtext — the toolbar's PageHeader-style subtitle,
          revealed only while the header is expanded (aligned under the title). */}
      {expanded ? (
        <input
          id="workflow-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Workflow description"
          placeholder="Describe what this workflow does…"
          className="ml-8 h-7 w-full max-w-2xl rounded-md border border-transparent bg-transparent px-2 text-sm text-muted-foreground hover:border-border focus-visible:border-border focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      ) : null}
    </header>
  );
}
