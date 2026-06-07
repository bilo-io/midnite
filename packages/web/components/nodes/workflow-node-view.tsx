'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Check, Loader2, X, type LucideIcon } from 'lucide-react';
import { getNodeTypeDefinition, type NodeRunStatus } from '@midnite/shared';
import type { AppNode, WorkflowNodeData } from '@/lib/workflow-store';
import { hueVarForCategory, iconFor } from '@/lib/workflow-node-catalog';
import { cn } from '@/lib/utils';

function StatusIndicator({ status }: { status?: NodeRunStatus }) {
  if (status === 'running') {
    return <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'hsl(var(--status-wip))' }} />;
  }
  if (status === 'succeeded') {
    return <Check className="h-3.5 w-3.5" style={{ color: 'hsl(var(--status-done))' }} />;
  }
  if (status === 'failed') {
    return <X className="h-3.5 w-3.5" style={{ color: 'hsl(var(--destructive))' }} />;
  }
  return null;
}

function summarize(data: WorkflowNodeData): string {
  const p = data.params;
  if (data.kind === 'http.request') {
    const method = typeof p.method === 'string' ? p.method : 'GET';
    const url = typeof p.url === 'string' && p.url ? p.url : 'No URL set';
    return `${method} ${url}`;
  }
  if (data.kind === 'ai.claude') {
    return typeof p.prompt === 'string' && p.prompt ? p.prompt : 'No prompt set';
  }
  return getNodeTypeDefinition(data.kind)?.description ?? '';
}

export function WorkflowNodeView({ data, selected }: NodeProps<AppNode>) {
  const def = getNodeTypeDefinition(data.kind);
  const category = def?.category ?? 'action';
  const Icon: LucideIcon = iconFor(def?.icon);
  const hueVar = hueVarForCategory(category);

  return (
    <div
      className={cn(
        'min-w-[190px] max-w-[260px] rounded-lg border bg-card/85 shadow-sm backdrop-blur-sm transition-shadow',
        selected ? 'ring-1 ring-ring' : '',
        data.status === 'failed' ? 'border-destructive/60' : 'border-border',
      )}
      style={{ ['--node-hue' as string]: `var(${hueVar})` }}
    >
      {def && def.inputs.length > 0 ? (
        <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border !border-border !bg-card" />
      ) : null}

      <div
        className="flex items-center gap-2 rounded-t-lg border-b px-3 py-2"
        style={{ borderColor: 'hsl(var(--node-hue) / 0.25)', background: 'hsl(var(--node-hue) / 0.08)' }}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
          style={{ background: 'hsl(var(--node-hue) / 0.18)', color: 'hsl(var(--node-hue))' }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{data.label}</span>
        <StatusIndicator status={data.status} />
      </div>

      <div className="truncate px-3 py-2 text-[11px] text-muted-foreground">{summarize(data)}</div>

      {def && def.outputs.length > 0 ? (
        <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border !border-border !bg-card" />
      ) : null}
    </div>
  );
}
