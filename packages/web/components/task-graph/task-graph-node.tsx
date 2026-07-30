'use client';

import { useTranslations } from 'next-intl';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { statusHueVar } from '@/components/task-columns';
import { useStatusLabel } from '@/lib/i18n-labels';
import { GRAPH_NODE_HEIGHT, GRAPH_NODE_WIDTH, type TaskGraphNodeData } from '@/lib/task-graph-layout';
import { cn } from '@/lib/utils';

// Priority chip appearance; the label itself comes from `board.priority.*`.
const PRIORITY_CHIP: Record<number, { key: 'low' | 'high' | 'urgent'; className: string }> = {
  0: { key: 'low', className: 'bg-muted text-muted-foreground' },
  2: { key: 'high', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  3: { key: 'urgent', className: 'bg-destructive/15 text-destructive' },
};

/**
 * Phase 58 B — one task in the dependency DAG. Colour comes from the shared
 * status hue vars (so it reads the same as the board); ready/blocked + priority
 * are chips. Connect handles are real (drag between two nodes to add/rewire a
 * blocker, mirroring the milestone graph) — a selected edge is deleted with
 * Delete/Backspace. Left→right layout, so the target handle (incoming from a
 * blocker) is on the left, source on the right.
 */
export function TaskGraphNode({ data, selected }: NodeProps) {
  const t = useTranslations('board');
  const statusLabel = useStatusLabel();
  const node = data as TaskGraphNodeData;
  const hue = statusHueVar(node.status);
  const priority = PRIORITY_CHIP[node.priority];
  const blocked = node.unmetBlockerCount > 0;
  const done = node.status === 'done';

  return (
    <div
      className={cn(
        // No full-bleed child needs corner-clipping here (unlike the milestone
        // node's header bar), and `overflow-hidden` would clip the connect
        // handles — which sit right at this box's edge — enough to make their
        // hit area nearly unreachable.
        'flex flex-col justify-between rounded-lg border task-surface px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md',
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
      <Handle type="target" position={Position.Left} onClick={(e) => e.stopPropagation()} />
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
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {t('graph.otherProject')}
          </span>
        ) : node.ready ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `hsl(var(--status-done) / 0.15)`,
              color: `hsl(var(--status-done))`,
            }}
          >
            {t('graph.ready')}
          </span>
        ) : blocked ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `hsl(var(--status-waiting) / 0.15)`,
              color: `hsl(var(--status-waiting))`,
            }}
          >
            {t('graph.blockedBy', { count: node.unmetBlockerCount })}
          </span>
        ) : null}
        {priority ? (
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', priority.className)}>
            {t(`priority.${priority.key}`)}
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
