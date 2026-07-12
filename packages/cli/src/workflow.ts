import type {
  NodeRunStatus,
  Workflow,
  WorkflowEvent,
  WorkflowRun,
  WorkflowSummary,
} from '@midnite/shared';

import { colourBool, dim, error, success, warn } from './lib/palette.js';

export { gatewayWsUrl } from './ws.js';

const DASH = '—';

/** Colour a workflow/run status: succeeded→green, failed→red, running→yellow, else dim. */
function colourRunStatus(status: string): string {
  if (status === 'succeeded') return success(status);
  if (status === 'failed') return error(status);
  if (status === 'running') return warn(status);
  return dim(status);
}

/** Locale-free ISO → `YYYY-MM-DD HH:MM` so table output is stable across machines. */
function formatTime(iso: string): string {
  return iso.replace('T', ' ').slice(0, 16);
}

/** Human label for a workflow's trigger, including the cron for schedules. */
export function triggerLabel(s: Pick<WorkflowSummary, 'triggerType' | 'cron'>): string {
  if (s.triggerType === 'schedule' && s.cron) return `schedule (${s.cron})`;
  return s.triggerType;
}

/** `<status> · <time>` for the last run, or an em-dash when never run. */
export function lastRunLabel(s: Pick<WorkflowSummary, 'lastRunStatus' | 'lastRunAt'>): string {
  if (!s.lastRunStatus && !s.lastRunAt) return DASH;
  const when = s.lastRunAt ? formatTime(s.lastRunAt) : '';
  const status = s.lastRunStatus ? colourRunStatus(s.lastRunStatus) : DASH;
  return [status, when].filter(Boolean).join(' · ');
}

/** Table rows for `workflow list`: id → name → enabled → trigger → steps → last run. */
export function workflowListRows(summaries: WorkflowSummary[]): string[][] {
  return summaries.map((s) => [
    s.id,
    s.name,
    colourBool(s.enabled),
    triggerLabel(s),
    String(s.nodeCount),
    lastRunLabel(s),
  ]);
}

/** Table rows for `workflow runs`: id → status → trigger → started → finished → nodes. */
export function runListRows(runs: WorkflowRun[]): string[][] {
  return runs.map((r) => [
    r.id,
    colourRunStatus(r.status),
    r.triggerSource,
    formatTime(r.startedAt),
    r.finishedAt ? formatTime(r.finishedAt) : DASH,
    String(r.nodeRuns.length),
  ]);
}

export type NodeLabel = (nodeId: string) => string;

/** Resolve a node's display label from the workflow graph, falling back to its id. */
export function nodeLabelOf(workflow: Workflow): NodeLabel {
  const byId = new Map(workflow.nodes.map((n) => [n.id, n.label?.trim() ? n.label : n.id]));
  return (nodeId) => byId.get(nodeId) ?? nodeId;
}

function runMark(status: WorkflowRun['status']): string {
  return status === 'succeeded' ? success('✓') : error('✗');
}

function nodeMark(status: NodeRunStatus): string {
  switch (status) {
    case 'succeeded':
      return success('✓');
    case 'failed':
      return error('✗');
    case 'running':
    case 'skipped':
      return dim('·');
    default:
      return ' ';
  }
}

/**
 * Map a single live {@link WorkflowEvent} to one status line for `run --watch`,
 * or `null` for events that don't warrant a line. Pure and colourless so it can
 * be snapshot-tested; the WS plumbing that calls it lives in the command.
 */
export function watchEventLine(event: WorkflowEvent, labelOf: NodeLabel): string | null {
  switch (event.type) {
    case 'run.started':
      return '▶ run started';
    case 'node.started':
      return `  · ${labelOf(event.nodeId)} …`;
    case 'node.succeeded':
      return `  ✓ ${labelOf(event.nodeId)}`;
    case 'node.failed':
      return `  ✗ ${labelOf(event.nodeId)}: ${event.error}`;
    case 'run.finished':
      return `${runMark(event.run.status)} run ${event.run.status}`;
    case 'run.failed':
      return `✗ run failed: ${event.error}`;
    default:
      return null;
  }
}

/**
 * Per-node summary lines for a run that's already terminal — used when `--watch`
 * connects after the run finished (the events fired before we subscribed), so the
 * live line stream would otherwise be empty.
 */
export function runSummaryLines(run: WorkflowRun, labelOf: NodeLabel): string[] {
  const lines = run.nodeRuns.map(
    (nr) => `  ${nodeMark(nr.status)} ${labelOf(nr.nodeId)}  ${nr.status}`,
  );
  lines.push(`${runMark(run.status)} run ${run.status}`);
  return lines;
}
