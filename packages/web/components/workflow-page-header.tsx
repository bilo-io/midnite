'use client';

import { BookmarkPlus, History, Loader2, Play, Power, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { HoverExpandButton } from '@/components/hover-expand-button';
import { TriggerBadge } from '@/components/trigger-badge';
import { describeCron } from '@/lib/cron';
import { useWorkflowStore } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

/**
 * The workflow editor's page header (Phase 74) — the same shared `PageHeader`
 * every detail view uses (back link + title + subtitle), with the title and
 * description made **inline-editable** since a workflow is authored here. Its
 * actions mirror the session cockpit: icon-only controls that reveal their label
 * on hover (the {@link HoverExpandButton} pattern). Lives inside the
 * `WorkflowStoreContext` so it binds straight to the store.
 */
export function WorkflowPageHeader({
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

  const triggerLabel =
    trigger.type === 'schedule'
      ? describeCron(trigger.cron)
      : trigger.type === 'webhook'
        ? 'Runs on a webhook'
        : trigger.type === 'task-event'
          ? 'Runs on a task event'
          : 'Runs on demand';

  return (
    <PageHeader
      title={name || 'Untitled workflow'}
      icon="Workflow"
      back={{ href: '/workflows', label: 'All workflows' }}
      titleNode={
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Workflow name"
          placeholder="Untitled workflow"
          // Inherits the h1's size/weight (Tailwind preflight sets font-size/weight
          // to inherit on inputs); auto-sizes to its content so it reads as heading
          // text rather than a boxed field.
          size={Math.max(name.length, 8)}
          className="-mx-1 min-w-0 max-w-full rounded px-1 outline-none transition-colors hover:bg-accent/40 focus:bg-accent/40 focus:ring-1 focus:ring-ring"
        />
      }
      description={
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Workflow description"
          placeholder="Describe what this workflow does…"
          className="-mx-1 w-full max-w-2xl rounded px-1 outline-none transition-colors hover:bg-accent/40 focus:bg-accent/40 focus:text-foreground focus:ring-1 focus:ring-ring"
        />
      }
      actions={
        <div className="flex items-center gap-1.5">
          {/* Trigger — a labelled chip (it names how the workflow fires); click to edit. */}
          <button
            type="button"
            onClick={onEditTrigger}
            title="Change trigger"
            aria-label="Change trigger"
            className="flex h-8 items-center gap-2 rounded-md border border-transparent px-2 transition-colors hover:border-border hover:bg-accent/40"
          >
            <TriggerBadge type={trigger.type} />
            <span className="hidden text-xs text-muted-foreground sm:inline">{triggerLabel}</span>
          </button>
          <HoverExpandButton
            icon={<History className="h-3.5 w-3.5" />}
            label="Run history"
            variant={historyOpen ? 'secondary' : 'ghost'}
            onClick={onHistory}
            className={cn('text-muted-foreground', historyOpen && 'border border-border bg-muted text-foreground')}
          />
          {onSaveAsTemplate ? (
            <HoverExpandButton
              icon={<BookmarkPlus className="h-3.5 w-3.5" />}
              label="Save as template"
              variant="ghost"
              onClick={onSaveAsTemplate}
              className="text-muted-foreground"
            />
          ) : null}
          {/* Enabled toggle — tints primary when on; label flips to reflect state. */}
          <HoverExpandButton
            icon={<Power className="h-3.5 w-3.5" />}
            label={enabled ? 'Enabled' : 'Disabled'}
            variant="ghost"
            onClick={() => setEnabled(!enabled)}
            className={enabled ? 'text-primary' : 'text-muted-foreground'}
          />
          <HoverExpandButton
            icon={running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            label="Run"
            variant="default"
            onClick={onRun}
            disabled={running}
          />
          <HoverExpandButton
            icon={saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            label={dirty ? 'Save' : 'Saved'}
            variant="secondary"
            onClick={onSave}
            disabled={!dirty || saving}
          />
        </div>
      }
    />
  );
}
