'use client';

import Link from 'next/link';
import type { WorkflowSummary } from '@midnite/shared';
import { TriggerBadge } from '@/components/trigger-badge';
import { LastRunStatus, WorkflowEnabledSwitch } from '@/components/workflow-controls';

function nodeLabel(count: number): string {
  return `${count} node${count === 1 ? '' : 's'}`;
}

export function WorkflowCard({
  workflow,
  layout,
}: {
  workflow: WorkflowSummary;
  layout: 'grid' | 'list';
}) {
  if (layout === 'list') {
    return (
      <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40">
        <Link href={`/workflows/${workflow.id}`} className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium group-hover:text-foreground">{workflow.name}</span>
          {workflow.description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{workflow.description}</p>
          ) : null}
        </Link>
        <TriggerBadge type={workflow.triggerType} className="hidden sm:inline-flex" />
        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
          {nodeLabel(workflow.nodeCount)}
        </span>
        <LastRunStatus status={workflow.lastRunStatus} className="hidden md:inline-flex" />
        <WorkflowEnabledSwitch id={workflow.id} enabled={workflow.enabled} />
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col gap-3 rounded-lg border bg-card/60 p-4 backdrop-blur-sm transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/workflows/${workflow.id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold group-hover:text-foreground">{workflow.name}</h3>
          {workflow.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{workflow.description}</p>
          ) : null}
        </Link>
        <WorkflowEnabledSwitch id={workflow.id} enabled={workflow.enabled} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TriggerBadge type={workflow.triggerType} />
          <span className="text-[11px] text-muted-foreground">{nodeLabel(workflow.nodeCount)}</span>
        </div>
        <LastRunStatus status={workflow.lastRunStatus} />
      </div>
    </div>
  );
}
