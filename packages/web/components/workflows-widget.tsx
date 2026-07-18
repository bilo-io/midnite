'use client';

import Link from 'next/link';
import { Check, RefreshCw, Workflow, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getNodeTypeDefinition, type RunStatus, type WorkflowSummary } from '@midnite/shared';
import { listWorkflows } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn, relativeTime } from '@/lib/utils';
import { iconFor } from '@/lib/workflow-node-catalog';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 30_000;
const MAX_STEPS = 6;

const RUN_BADGE: Record<RunStatus, string> = {
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  succeeded: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  failed: 'bg-destructive/15 text-destructive',
  canceled: 'bg-muted text-muted-foreground',
};

// Succeeded/failed collapse to a glyph; the rest keep their (capitalized) label.
const RUN_ICON: Partial<Record<RunStatus, LucideIcon>> = {
  succeeded: Check,
  failed: X,
};

export function WorkflowsWidget() {
  const { data, error, loading, refresh } = usePolling(() => listWorkflows(), REFRESH_MS);

  const workflows = (data ?? [])
    .filter((w) => !w.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <WidgetCard
      title="Workflows"
      icon={Workflow}
      actions={
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh workflows"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {error && !data ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load workflows.</p>
      ) : !data && loading ? (
        <WidgetLoader />
      ) : workflows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No workflows yet.</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {workflows.map((w) => (
            <WorkflowRow key={w.id} workflow={w} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function WorkflowRow({ workflow: w }: { workflow: WorkflowSummary }) {
  const steps = w.steps ?? [];
  const shown = steps.slice(0, MAX_STEPS);
  const overflow = steps.length - shown.length;
  const meta = [w.lastRunAt ? relativeTime(w.lastRunAt) : null].filter(Boolean).join(' · ');

  return (
    <li>
      <Link
        href={`/workflows/edit?id=${w.id}`}
        className="flex items-center gap-2 px-4 py-2 transition-colors hover:bg-accent"
      >
        <span
          aria-hidden
          className={cn('h-2 w-2 shrink-0 rounded-full', w.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40')}
          title={w.enabled ? 'Enabled' : 'Disabled'}
        />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{w.name}</span>
          {shown.length > 0 ? (
            <span className="mt-1 flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-muted-foreground">
                {shown.map((s, i) => {
                  const def = getNodeTypeDefinition(s.type);
                  const Icon = iconFor(def?.icon);
                  return (
                    <span key={i} title={s.label || def?.title || s.type} className="inline-flex">
                      <Icon className="h-3 w-3" aria-hidden />
                    </span>
                  );
                })}
                {overflow > 0 && <span className="text-[10px] tabular-nums">+{overflow}</span>}
              </span>
              {meta && <span className="truncate text-[11px] text-muted-foreground">{meta}</span>}
            </span>
          ) : (
            <span className="block truncate text-[11px] text-muted-foreground">
              {meta || `${w.nodeCount} ${w.nodeCount === 1 ? 'node' : 'nodes'}`}
            </span>
          )}
        </div>
        {w.lastRunStatus && (() => {
          const Icon = RUN_ICON[w.lastRunStatus];
          return (
            <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', RUN_BADGE[w.lastRunStatus])}>
              {Icon ? <Icon className="h-3 w-3" aria-label={w.lastRunStatus} /> : w.lastRunStatus}
            </span>
          );
        })()}
      </Link>
    </li>
  );
}
