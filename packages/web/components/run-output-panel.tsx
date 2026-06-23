'use client';

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import type { NodeRunLog, NodeRunStatus, WorkflowRun } from '@midnite/shared';
import { ExportMenu } from '@/components/export-menu';
import { exportWorkflowRunMarkdown } from '@/lib/api';
import { useWorkflowStore } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

const STATUS_HUE: Record<NodeRunStatus, string> = {
  pending: '--status-backlog',
  running: '--status-wip',
  succeeded: '--status-done',
  failed: '--destructive',
  skipped: '--status-abandoned',
};

const LOG_LEVEL_HUE: Record<NodeRunLog['level'], string> = {
  debug: '--status-backlog',
  info: '--status-todo',
  warn: '--status-wip',
  error: '--destructive',
};

type Tab = 'nodes' | 'logs';

export function RunOutputPanel({ run }: { run: WorkflowRun | null }) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>('nodes');
  const [expanded, setExpanded] = useState<string | null>(null);
  const nodes = useWorkflowStore((s) => s.nodes);
  const workflowName = useWorkflowStore((s) => s.name);
  const labelOf = (nodeId: string) => nodes.find((n) => n.id === nodeId)?.data.label ?? nodeId;

  // Flatten every node's logs into one chronological stream, tagged with the node label.
  const logs = (run?.nodeRuns ?? [])
    .flatMap((nr) => nr.logs.map((log) => ({ ...log, nodeId: nr.nodeId, key: `${nr.id}-${log.at}-${log.message}` })))
    .sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="shrink-0 border-t border-border/60 bg-background/70">
      <div className="flex items-center gap-1 px-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className={cn('h-3.5 w-3.5 transition-transform', open ? 'rotate-180' : '')} />
          Run output
          {run ? <span className="capitalize text-foreground">· {run.status}</span> : null}
        </button>

        <div className="ml-auto flex items-center gap-1">
          {(['nodes', 'logs'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setOpen(true);
              }}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium capitalize transition-colors',
                tab === t ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
          {run ? (
            <ExportMenu
              filename={`${(workflowName || 'workflow').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-run`}
              title={`${workflowName} — Run`}
              fetchMarkdown={() => exportWorkflowRunMarkdown(run.workflowId, run.id)}
            />
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out motion-reduce:transition-none',
          open ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        {tab === 'nodes' ? (
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
                    <div className="space-y-2 border-t border-border/40 px-2.5 py-2">
                      {nr.error ? <DataBlock label="Error" value={nr.error} tone="error" /> : null}
                      {nr.input !== undefined ? <DataBlock label="Input" value={nr.input} /> : null}
                      {/* Params after {{expr}} resolution — what the executor actually
                          received. Absent for trigger nodes (no resolution). */}
                      {nr.resolvedParams !== undefined ? (
                        <DataBlock label="Resolved params" value={nr.resolvedParams} />
                      ) : null}
                      {nr.output !== undefined ? <DataBlock label="Output" value={nr.output} /> : null}
                      {!nr.error &&
                      nr.input === undefined &&
                      nr.resolvedParams === undefined &&
                      nr.output === undefined ? (
                        <p className="text-[11px] text-muted-foreground">No data.</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto px-4 pb-3">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No logs yet.</p>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                {logs.map((log) => (
                  <div key={log.key} className="flex gap-2">
                    <span className="shrink-0 text-muted-foreground/60">{log.at.slice(11, 19)}</span>
                    <span
                      className="shrink-0 font-semibold uppercase"
                      style={{ color: `hsl(var(${LOG_LEVEL_HUE[log.level]}))` }}
                    >
                      {log.level}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{labelOf(log.nodeId)}</span>
                    <span className="text-foreground">{log.message}</span>
                  </div>
                ))}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// A labelled block of run data: a string is shown verbatim (errors, text output);
// anything else is pretty-printed JSON. Drives the per-node input → resolved
// params → output view.
function DataBlock({ label, value, tone }: { label: string; value: unknown; tone?: 'error' }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2);
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <pre
        className="max-h-28 overflow-auto whitespace-pre-wrap rounded bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground"
        style={tone === 'error' ? { color: 'hsl(var(--destructive))' } : undefined}
      >
        {text}
      </pre>
    </div>
  );
}
