'use client';

import { useState } from 'react';
import type { RunStatus } from '@midnite/shared';
import { Switch } from '@/components/ui/switch';
import { updateWorkflow } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { cn } from '@/lib/utils';

const STATUS_HUE: Record<RunStatus, string> = {
  queued: '--status-todo',
  running: '--status-wip',
  succeeded: '--status-done',
  failed: '--destructive',
  canceled: '--status-abandoned',
};

// Optimistic enable/disable toggle, shared by every workflow view so the action
// behaves identically in grid, list, and table.
export function WorkflowEnabledSwitch({ id, enabled: initial }: { id: string; enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setBusy(true);
    setEnabled(next);
    try {
      await updateWorkflow(id, { enabled: next });
      invalidateData();
    } catch {
      setEnabled(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  return <Switch checked={enabled} onCheckedChange={toggle} disabled={busy} aria-label="Enabled" />;
}

export function LastRunStatus({ status, className }: { status?: RunStatus; className?: string }) {
  if (!status) {
    return <span className={cn('text-[11px] text-muted-foreground/50', className)}>Never run</span>;
  }
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[11px] capitalize text-muted-foreground', className)}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: `hsl(var(${STATUS_HUE[status] ?? '--status-backlog'}))` }}
      />
      {status}
    </span>
  );
}
