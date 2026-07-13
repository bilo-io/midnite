'use client';

import type {
  AssistantBlock,
  AssistantComponentBlock,
  AssistantSparklineMetric,
} from '@midnite/shared';

import { MarkdownPreview } from '@/components/markdown-preview';
import { TaskCard } from '@/components/task-card';
import {
  getCycleTime,
  getGaugeHistory,
  getOpsMetrics,
  getSessions,
  getTaskCounts,
  getTasks,
} from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

/**
 * Phase 66 E — render one assistant answer block. Prose goes through the shared
 * `MarkdownPreview`; a component block is dispatched by `name` to a renderer that
 * resolves the *real* data client-side from the id/param the LLM emitted (the
 * LLM never carries the data itself — see the AssistantBlock contract). An
 * unknown name degrades to a small notice rather than crashing the transcript.
 */
export function AssistantBlockView({ block }: { block: AssistantBlock }) {
  if (block.kind === 'markdown') {
    return <MarkdownPreview content={block.text} />;
  }
  return <ComponentBlockView block={block} />;
}

function ComponentBlockView({ block }: { block: AssistantComponentBlock }) {
  switch (block.name) {
    case 'task-card':
      return <TaskCardBlock taskId={block.props.taskId} />;
    case 'fleet-gauge':
      return <FleetGaugeBlock />;
    case 'session-list':
      return <SessionListBlock limit={block.props.limit} />;
    case 'sparkline':
      return <SparklineBlock metric={block.props.metric} />;
    default:
      // Exhaustiveness guard — an unknown name shouldn't reach here (the contract
      // validates names), but degrade gracefully if it ever does.
      return <BlockNotice>Unsupported component.</BlockNotice>;
  }
}

function BlockNotice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{children}</div>;
}

/** `task-card` — resolve the referenced id against the (cached) board task list. */
function TaskCardBlock({ taskId }: { taskId: string }) {
  const { data, loading } = useApiData(getTasks, ['assistant-tasks']);
  if (loading && !data) return <BlockNotice>Loading task…</BlockNotice>;
  const task = data?.find((t) => t.id === taskId);
  if (!task) return <BlockNotice>Task {taskId} is no longer on the board.</BlockNotice>;
  return <TaskCard task={task} />;
}

/** `fleet-gauge` — live status counts as a compact strip. */
function FleetGaugeBlock() {
  const { data, loading } = useApiData(getTaskCounts, ['assistant-counts']);
  if (loading && !data) return <BlockNotice>Loading counts…</BlockNotice>;
  if (!data) return <BlockNotice>Counts unavailable.</BlockNotice>;
  const cells: Array<{ label: string; value: number; className: string }> = [
    { label: 'Backlog', value: data.backlog, className: 'text-muted-foreground' },
    { label: 'To do', value: data.todo, className: 'text-blue-600 dark:text-blue-400' },
    { label: 'In progress', value: data.inProgress, className: 'text-amber-600 dark:text-amber-400' },
    { label: 'Done', value: data.done, className: 'text-success' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Fleet task counts">
      {cells.map((c) => (
        <div key={c.label} className="rounded-md border border-border/60 bg-card px-2 py-1.5 text-center">
          <div className={`text-lg font-semibold tabular-nums ${c.className}`}>{c.value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

/** `session-list` — the active (non-archived) sessions, capped. */
function SessionListBlock({ limit = 8 }: { limit?: number }) {
  const { data, loading } = useApiData(getSessions, ['assistant-sessions']);
  if (loading && !data) return <BlockNotice>Loading sessions…</BlockNotice>;
  const active = (data ?? []).filter((s) => !s.archivedAt).slice(0, limit);
  if (active.length === 0) return <BlockNotice>No active sessions.</BlockNotice>;
  return (
    <ul className="divide-y divide-border/60 rounded-md border border-border/60 bg-card" aria-label="Active sessions">
      {active.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
          <span className="truncate">{s.title}</span>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {s.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

const METRIC_LABEL: Record<AssistantSparklineMetric, string> = {
  'cycle-time': 'Cycle time (wait · work · lead, p50)',
  throughput: 'Throughput (runs/day)',
  'queue-depth': 'Queue depth',
  cost: 'Spend by dimension (USD)',
};

/** `sparkline` — a small trend of one metric, resolved from its metrics endpoint. */
function SparklineBlock({ metric }: { metric: AssistantSparklineMetric }) {
  const { data, loading } = useApiData((signal) => resolveMetricSeries(metric, signal), ['assistant-metric', metric]);
  if (loading && !data) return <BlockNotice>Loading {METRIC_LABEL[metric]}…</BlockNotice>;
  const points = data ?? [];
  return (
    <figure className="rounded-md border border-border/60 bg-card px-3 py-2">
      <figcaption className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{METRIC_LABEL[metric]}</figcaption>
      {points.length < 2 ? (
        <div className="text-xs text-muted-foreground">Not enough data to plot a trend yet.</div>
      ) : (
        <Sparkline points={points} />
      )}
    </figure>
  );
}

/** Resolve a numeric series for a metric from the existing metrics endpoints. */
async function resolveMetricSeries(metric: AssistantSparklineMetric, signal: AbortSignal): Promise<number[]> {
  switch (metric) {
    case 'throughput': {
      const ops = await getOpsMetrics();
      return ops.throughputByDay.map((d) => d.count);
    }
    case 'queue-depth': {
      const hist = await getGaugeHistory();
      return hist.samples.map((s) => s.queueDepth ?? 0);
    }
    case 'cycle-time': {
      const cycle = await getCycleTime({ windowDays: 14, groupBy: 'none' });
      const g = cycle.groups[0];
      if (!g) return [];
      return [g.wait.p50Ms ?? 0, g.work.p50Ms ?? 0, g.endToEnd.p50Ms ?? 0];
    }
    case 'cost':
    default:
      // Cost-over-time isn't a single first-class series yet; degrade gracefully
      // rather than fabricate one. (Additive follow-up: wire spend-trend.)
      return [];
  }
}

/** Minimal dependency-free sparkline (inline SVG polyline). */
function Sparkline({ points }: { points: number[] }) {
  const width = 240;
  const height = 40;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points
    .map((p, i) => `${(i * step).toFixed(1)},${(height - ((p - min) / span) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="trend">
      <polyline points={coords} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
