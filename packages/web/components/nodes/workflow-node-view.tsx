'use client';

import { Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Check, Loader2, X, type LucideIcon } from 'lucide-react';
import { getNodeTypeDefinition, type NodeRunStatus } from '@midnite/shared';
import type { AppNode, WorkflowNodeData } from '@/lib/workflow-store';
import { hueVarForCategory, iconFor } from '@/lib/workflow-node-catalog';
import { LLM_PROVIDER_ICON_KEY, resolveAiNodeProvider } from '@/lib/ai-node';
import { ProviderIcon } from '@/components/provider-icon';
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
  if (data.kind === 'logic.branch') {
    const left = typeof p.left === 'string' && p.left ? p.left : 'input';
    const op = typeof p.operator === 'string' ? p.operator : 'isTruthy';
    const right = typeof p.right === 'string' ? p.right : '';
    const labels: Record<string, string> = {
      isTruthy: 'is truthy',
      isFalsy: 'is falsy',
      equals: '=',
      notEquals: '≠',
      contains: 'contains',
      gt: '>',
      gte: '≥',
      lt: '<',
      lte: '≤',
    };
    const phrase = labels[op] ?? op;
    return op === 'isTruthy' || op === 'isFalsy' ? `${left} ${phrase}` : `${left} ${phrase} ${right}`.trim();
  }
  return getNodeTypeDefinition(data.kind)?.description ?? '';
}

export function WorkflowNodeView({ data, selected }: NodeProps<AppNode>) {
  const def = getNodeTypeDefinition(data.kind);
  const category = def?.category ?? 'action';
  const Icon: LucideIcon = iconFor(def?.icon);
  const hueVar = hueVarForCategory(category);
  // An AI node pinned to (or inferring) a provider wears that provider's brand
  // icon; otherwise it falls back to the default robot below.
  const aiProvider = data.kind === 'ai.claude' ? resolveAiNodeProvider(data.params) : null;
  // The handle id MUST equal the port name persisted on edges (sourcePort/targetPort),
  // or edges won't bind to a handle and React Flow silently drops them after a reload.
  const inputPort = def?.inputs[0];
  const outputPorts = def?.outputs ?? [];
  const multiOutput = outputPorts.length > 1;
  const runClass =
    data.status === 'running'
      ? 'node-running'
      : data.status === 'succeeded'
        ? 'node-succeeded'
        : data.status === 'failed'
          ? 'node-failed'
          : 'border-border';

  return (
    <div
      className={cn(
        'relative min-w-[190px] max-w-[260px] rounded-lg border bg-card/85 shadow-sm backdrop-blur-sm transition-all duration-200 motion-reduce:transition-none',
        selected ? 'ring-1 ring-ring' : '',
        runClass,
      )}
      style={{ ['--node-hue' as string]: `var(${hueVar})` }}
    >
      {inputPort ? (
        <Handle
          type="target"
          id={inputPort.name}
          position={Position.Left}
          className="!h-2 !w-2 !border !border-border !bg-card"
        />
      ) : null}

      <div
        className="flex items-center gap-2 rounded-t-lg border-b px-3 py-2"
        style={{ borderColor: 'hsl(var(--node-hue) / 0.25)', background: 'hsl(var(--node-hue) / 0.08)' }}
      >
        {aiProvider ? (
          <ProviderIcon provider={LLM_PROVIDER_ICON_KEY[aiProvider]} size={20} />
        ) : (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
            style={{ background: 'hsl(var(--node-hue) / 0.18)', color: 'hsl(var(--node-hue))' }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{data.label}</span>
        <StatusIndicator status={data.status} />
      </div>

      <div className="truncate px-3 py-2 text-[11px] text-muted-foreground">{summarize(data)}</div>

      {data.status === 'failed' && data.error ? (
        // Surface the run failure (e.g. an ExpressionError) inline so a bad
        // {{expr}} reference is obvious on the canvas, not just in the run log.
        <div
          className="truncate border-t px-3 py-1.5 text-[11px]"
          style={{ borderColor: 'hsl(var(--destructive) / 0.25)', color: 'hsl(var(--destructive))' }}
          title={data.error}
        >
          {data.error}
        </div>
      ) : null}

      {multiOutput ? <div className="h-3" /> : null}
      {outputPorts.map((port, i) => {
        // Single output stays vertically centered; multiple ports fan out down the right edge.
        const top = multiOutput ? 40 + (i * 45) / (outputPorts.length - 1) : 50;
        return (
          <Fragment key={port.name}>
            {multiOutput ? (
              <span
                className="pointer-events-none absolute right-4 -translate-y-1/2 text-[9px] font-medium uppercase tracking-wide text-muted-foreground"
                style={{ top: `${top}%` }}
              >
                {port.label ?? port.name}
              </span>
            ) : null}
            <Handle
              type="source"
              id={port.name}
              position={Position.Right}
              style={multiOutput ? { top: `${top}%` } : undefined}
              className="!h-2 !w-2 !border !border-border !bg-card"
            />
          </Fragment>
        );
      })}
    </div>
  );
}
