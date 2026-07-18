'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

// Succeeded/failed collapse to a glyph; the rest keep their (capitalized) label.
const STATUS_ICON: Partial<Record<RunStatus, LucideIcon>> = {
  succeeded: Check,
  failed: X,
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
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground',
          className,
        )}
        style={{ background: 'hsl(var(--status-backlog) / 0.12)' }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: 'hsl(var(--status-backlog))' }}
        />
        Never run
      </span>
    );
  }
  const hue = STATUS_HUE[status] ?? '--status-backlog';
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] capitalize',
        className,
      )}
      style={{ background: `hsl(var(${hue}) / 0.12)`, color: `hsl(var(${hue}))` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(var(${hue}))` }} />
      {Icon ? <Icon className="h-3 w-3" aria-label={status} /> : status}
    </span>
  );
}
