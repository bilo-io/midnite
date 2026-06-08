'use client';

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import type { NodeRunStatus, WorkflowRun } from '@midnite/shared';
import { useWorkflowStore } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

const STATUS_HUE: Record<NodeRunStatus, string> = {
  pending: '--status-backlog',
  running: '--status-wip',
  succeeded: '--status-done',
  failed: '--destructive',
  skipped: '--status-abandoned',
};

export function RunOutputPanel({ run }: { run: WorkflowRun | null }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const nodes = useWorkflowStore((s) => s.nodes);
  const labelOf = (nodeId: string) => nodes.find((n) => n.id === nodeId)?.data.label ?? nodeId;

  return (
    <div className="shrink-0 border-t border-border/60 bg-background/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronUp className={cn('h-3.5 w-3.5 transition-transform', open ? '' : 'rotate-180')} />
        Run output
        {run ? <span className="capitalize text-foreground">· {run.status}</span> : null}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out motion-reduce:transition-none',
          open ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="max-h-56 space-y-1 overflow-y-auto px-4 pb-3">
          {!run ? (
            <p className="text-xs text-muted-foreground">Press Run to execute this workflow.</p>
          ) : run.nodeRuns.length === 0 ? (
            <p className="text-xs text-muted-foreground">No node activity yet.</p>
          ) : (
            run.nodeRuns.map((nr) => (
              <div key={nr.id} className="overflow-hidden rounded-md border border-border/50 bg-card/50">
                <button
                  type="button"
                  onClick={() => setExpanded((e) => (e === nr.id ? null : nr.id))}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: `hsl(var(${STATUS_HUE[nr.status] ?? '--status-backlog'}))` }}
                  />
                  <span className="font-medium">{labelOf(nr.nodeId)}</span>
                  <span className="capitalize text-muted-foreground">{nr.status}</span>
                </button>
                {expanded === nr.id ? (
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap border-t border-border/40 px-2.5 py-2 text-[11px] text-muted-foreground">
                    {nr.error ?? JSON.stringify(nr.output ?? null, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
