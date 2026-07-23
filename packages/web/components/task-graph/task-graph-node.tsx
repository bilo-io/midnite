'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { statusHueVar, statusLabel } from '@/components/task-columns';
import { GRAPH_NODE_HEIGHT, GRAPH_NODE_WIDTH, type TaskGraphNodeData } from '@/lib/task-graph-layout';
import { cn } from '@/lib/utils';

const PRIORITY_LABEL: Record<number, { label: string; className: string }> = {
  0: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  2: { label: 'High', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  3: { label: 'Urgent', className: 'bg-destructive/15 text-destructive' },
};

/**
 * Phase 58 B — one task in the dependency DAG. Colour comes from the shared
 * status hue vars (so it reads the same as the board); ready/blocked + priority
 * are chips. Read-only: connect handles are hidden (`isConnectable={false}` is
 * set by the layout), but React Flow still needs source/target handles present
 * for edges to attach — we render them invisibly. Left→right layout, so the
 * target handle (incoming from a blocker) is on the left, source on the right.
 */
export function TaskGraphNode({ data, selected }: NodeProps) {
  const node = data as TaskGraphNodeData;
  const hue = statusHueVar(node.status);
  const priority = PRIORITY_LABEL[node.priority];
  const blocked = node.unmetBlockerCount > 0;
  const done = node.status === 'done';

  return (
    <div
      className={cn(
        'flex flex-col justify-between overflow-hidden rounded-lg border task-surface px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md',
        node.foreign && 'border-dashed opacity-70',
        // Blocked (unmet blockers) reads dimmed, mirroring the board's blocked card.
        blocked && 'opacity-60',
        selected && 'ring-2 ring-ring',
        // Executing (an agent is actively running it) — the signature rotating,
        // pulsating gradient frame, shared across every task view.
        node.status === 'wip' && 'task-running',
        // Waiting (parked for input/approval) — a gentler, orange-toned cousin.
        node.status === 'waiting' && 'task-waiting',
      )}
      style={{
        width: GRAPH_NODE_WIDTH,
        height: GRAPH_NODE_HEIGHT,
        // Completed tasks wear a slightly thicker green border around the whole
        // card so "done" reads at a glance; the left accent stays the status hue.
        borderColor: done ? 'hsl(var(--status-done))' : undefined,
        borderWidth: done ? 2 : undefined,
        borderLeftColor: `hsl(${hue.startsWith('--') ? `var(${hue})` : hue})`,
        borderLeftWidth: 4,
      }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" isConnectable={false} />
      <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">{node.title}</p>
      <div className="flex items-center gap-1">
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: `hsl(var(${statusHueVar(node.status)}) / 0.15)`,
            color: `hsl(var(${statusHueVar(node.status)}))`,
          }}
        >
          {statusLabel(node.status)}
        </span>
        {node.foreign ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Other project</span>
        ) : node.ready ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `hsl(var(--status-done) / 0.15)`,
              color: `hsl(var(--status-done))`,
            }}
          >
            Ready
          </span>
        ) : blocked ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `hsl(var(--status-waiting) / 0.15)`,
              color: `hsl(var(--status-waiting))`,
            }}
          >
            Blocked by {node.unmetBlockerCount}
          </span>
        ) : null}
        {priority ? (
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', priority.className)}>{priority.label}</span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} className="!opacity-0" isConnectable={false} />
    </div>
  );
}
