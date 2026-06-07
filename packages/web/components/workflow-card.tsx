'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RunStatus, WorkflowSummary } from '@midnite/shared';
import { Switch } from '@/components/ui/switch';
import { TriggerBadge } from '@/components/trigger-badge';
import { updateWorkflow } from '@/lib/api';

const STATUS_HUE: Record<RunStatus, string> = {
  queued: '--status-todo',
  running: '--status-wip',
  succeeded: '--status-done',
  failed: '--destructive',
  canceled: '--status-abandoned',
};

export function WorkflowCard({ workflow }: { workflow: WorkflowSummary }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(workflow.enabled);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setBusy(true);
    setEnabled(next);
    try {
      await updateWorkflow(workflow.id, { enabled: next });
      router.refresh();
    } catch {
      setEnabled(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group relative flex flex-col gap-3 rounded-lg border bg-card/60 p-4 backdrop-blur-sm transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/workflows/${workflow.id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold group-hover:text-foreground">{workflow.name}</h3>
          {workflow.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{workflow.description}</p>
          ) : null}
        </Link>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={busy} aria-label="Enabled" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TriggerBadge type={workflow.triggerType} />
          <span className="text-[11px] text-muted-foreground">
            {workflow.nodeCount} node{workflow.nodeCount === 1 ? '' : 's'}
          </span>
        </div>
        {workflow.lastRunStatus ? (
          <span className="inline-flex items-center gap-1 text-[11px] capitalize text-muted-foreground">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: `hsl(var(${STATUS_HUE[workflow.lastRunStatus] ?? '--status-backlog'}))` }}
            />
            {workflow.lastRunStatus}
          </span>
        ) : null}
      </div>
    </div>
  );
}
