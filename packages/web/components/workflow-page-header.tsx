'use client';

import { useState } from 'react';
import { BookmarkPlus, History, Loader2, Pencil, Play, Power, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { EditDetailsModal } from '@/components/edit-details-modal';
import { HoverExpandButton } from '@/components/hover-expand-button';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { TriggerBadge } from '@/components/trigger-badge';
import { describeCron } from '@/lib/cron';
import { useWorkflowStore } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

/**
 * The workflow editor's page header (Phase 74; reshaped in the Phase 81
 * follow-up) — the same shared `PageHeader` every resource page uses: STATIC
 * title + description (no back link — the desktop title bar carries history
 * nav), with the controls in a `StickyToolbar` below it (trigger chip left,
 * icon controls right) so they never tuck behind the desktop title bar with
 * the collapsing header. Renaming goes through the pen button's
 * `EditDetailsModal`; edits write to the workflow store, so the ordinary
 * Save/autosave path persists them. The other actions mirror the session
 * cockpit: icon-only controls that reveal their label on hover
 * (the {@link HoverExpandButton} pattern). Lives inside the
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
  const [editing, setEditing] = useState(false);

  const triggerLabel =
    trigger.type === 'schedule'
      ? describeCron(trigger.cron)
      : trigger.type === 'webhook'
        ? 'Runs on a webhook'
        : trigger.type === 'task-event'
          ? 'Runs on a task event'
          : 'Runs on demand';

  return (
    <>
      <PageHeader
        title={name || 'Untitled workflow'}
        icon="Workflow"
        description={description || 'Describe what this workflow does…'}
      />

      {/* Editor actions live in the standard sticky controls row (not in the
          header, which tucks behind the desktop title bar when collapsed):
          trigger chip far left, icon controls right. */}
      <div className="container">
        <StickyToolbar>
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

          <div className="flex shrink-0 items-center gap-1.5">
            <HoverExpandButton
              icon={<Pencil className="h-3.5 w-3.5" />}
              label="Edit details"
              variant="ghost"
              onClick={() => setEditing(true)}
              className="text-muted-foreground"
            />
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
        </StickyToolbar>
      </div>

      {editing ? (
        <EditDetailsModal
          heading="Edit workflow"
          name={name}
          description={description}
          nameLabel="Name"
          onSave={(next) => {
            setName(next.name);
            setDescription(next.description);
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  );
}
