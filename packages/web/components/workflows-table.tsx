'use client';

import Link from 'next/link';
import type { WorkflowSummary } from '@midnite/shared';
import { TriggerBadge } from '@/components/trigger-badge';
import { LastRunStatus, WorkflowEnabledSwitch } from '@/components/workflow-controls';

export function WorkflowsTable({ workflows }: { workflows: WorkflowSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-card/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Trigger</th>
            <th className="px-3 py-2 text-right font-medium">Nodes</th>
            <th className="px-3 py-2 font-medium">Last run</th>
            <th className="px-3 py-2 text-right font-medium">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {workflows.map((w) => (
            <tr
              key={w.id}
              className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40"
            >
              <td className="px-3 py-2">
                <Link href={`/workflows/${w.id}`} className="block min-w-0">
                  <span className="truncate font-medium hover:text-foreground">{w.name}</span>
                  {w.description ? (
                    <span className="block truncate text-xs text-muted-foreground">{w.description}</span>
                  ) : null}
                </Link>
              </td>
              <td className="px-3 py-2">
                <TriggerBadge type={w.triggerType} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{w.nodeCount}</td>
              <td className="px-3 py-2">
                <LastRunStatus status={w.lastRunStatus} />
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-end">
                  <WorkflowEnabledSwitch id={w.id} enabled={w.enabled} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
