'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import type { WorkflowRun } from '@midnite/shared';
import { getWorkflowRun, listWorkflowRuns } from '@/lib/api';
import { formatRun } from '@/lib/cron';
import { createdTaskFromRun } from '@/lib/schedule-runs';
import { cn } from '@/lib/utils';

const RUN_STATUS_HUE: Record<WorkflowRun['status'], string> = {
  queued: '--status-backlog',
  running: '--status-wip',
  succeeded: '--status-done',
  failed: '--destructive',
  canceled: '--status-abandoned',
};

// Cap the inline list so a long-running schedule's history stays scannable — and
// so re-fetching each shown run's detail is a handful of calls, not hundreds.
const SHOWN = 8;

// Phase 45 D — a focused per-schedule run list. Unlike the canvas RunHistoryPanel
// (which replays node states onto the ReactFlow editor), this just answers "did my
// schedule fire, and what task did it open?" — each run links to the task it created.
// The list endpoint hydrates runs shallow (no nodeRuns), so the shown runs are
// re-fetched in detail to read the task.create output that carries the task link.
export function ScheduleRunHistory({ workflowId, timezone }: { workflowId: string; timezone: string }) {
  const [runs, setRuns] = useState<WorkflowRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listWorkflowRuns(workflowId)
      .then(async (list) => {
        const recent = [...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, SHOWN);
        // Hydrate the shown runs (parallel) so the created-task link resolves;
        // fall back to the shallow run if a detail fetch fails.
        const detailed = await Promise.all(
          recent.map((r) => getWorkflowRun(workflowId, r.id).catch(() => r)),
        );
        if (!cancelled) setRuns(detailed);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load runs');
      });
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  if (error) return <p className="text-[11px] text-destructive">{error}</p>;
  if (!runs) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading runs…
      </p>
    );
  }
  if (runs.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No runs yet — “Run now” or wait for the next fire.</p>;
  }

  return (
    <ul className="space-y-1" aria-label="Run history">
      {runs.map((run) => {
        const task = createdTaskFromRun(run);
        return (
          <li key={run.id} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: `hsl(var(${RUN_STATUS_HUE[run.status]}))` }}
              aria-hidden
            />
            <span className="tabular-nums text-muted-foreground">{formatRun(new Date(run.startedAt), timezone)}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground/80">{run.status}</span>
            {task ? (
              <Link
                href={`/tasks/view?id=${task.id}`}
                className={cn(
                  'ml-auto inline-flex max-w-[55%] items-center gap-0.5 truncate text-muted-foreground',
                  'hover:text-foreground hover:underline',
                )}
                title={task.title}
              >
                <span className="truncate">{task.title}</span>
                <ArrowUpRight className="h-3 w-3 shrink-0" />
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
