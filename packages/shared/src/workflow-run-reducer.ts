import type { WorkflowEvent } from './events/workflow.js';
import type { NodeRun, RunStatus, WorkflowRun } from './run.js';

const TERMINAL_RUN_STATUSES = new Set<RunStatus>(['succeeded', 'failed', 'canceled']);

/** Whether a run status is final (no further events expected). */
export function isRunTerminal(status: RunStatus): boolean {
  return TERMINAL_RUN_STATUSES.has(status);
}

// Apply a single live `WorkflowEvent` to the current run snapshot, returning a NEW
// run object (never mutating the input). This is the pure core of live run streaming:
// the web hook and the CLI `--watch` both seed a snapshot from REST, then fold the
// WS event stream through this reducer to track per-node status without re-fetching.
//
// Seeding: the snapshot is expected to already carry every node-run (the `runWorkflow`
// REST response persists all nodes as `pending` before execution starts), so node
// events patch in place. `run.finished` carries the authoritative full run and replaces
// the snapshot wholesale — the only event that can also seed from `null`. `run.failed`
// carries no run, so callers that want the final skipped/log detail should reconcile
// once over REST after applying it.
export function applyWorkflowEvent(
  run: WorkflowRun | null,
  event: WorkflowEvent,
): WorkflowRun | null {
  // `run.finished` is authoritative — accept it even with no prior snapshot, but only
  // when it matches the run we're tracking (if any).
  if (event.type === 'run.finished') {
    return run && run.id !== event.runId ? run : event.run;
  }

  // Every other event only mutates an existing, matching snapshot.
  if (run === null || run.id !== event.runId) return run;

  switch (event.type) {
    case 'run.started':
      return { ...run, status: 'running', startedAt: event.at };
    case 'run.failed':
      return { ...run, status: 'failed', error: event.error, finishedAt: event.at };
    case 'node.started':
      return patchNode(run, event.nodeId, (nr) => ({
        ...nr,
        status: 'running',
        startedAt: event.at,
      }));
    case 'node.succeeded':
      return patchNode(run, event.nodeId, (nr) => ({
        ...nr,
        status: 'succeeded',
        output: event.output,
        finishedAt: event.at,
      }));
    case 'node.failed':
      return patchNode(run, event.nodeId, (nr) => ({
        ...nr,
        status: 'failed',
        error: event.error,
        finishedAt: event.at,
      }));
    default: {
      // Exhaustiveness guard — a new event type must be handled explicitly.
      const _never: never = event;
      return _never;
    }
  }
}

// Replace a single node-run by id, leaving every other entry untouched. If the node
// isn't in the snapshot (a gap the REST seed should never leave) the event is a no-op —
// the reconnect/backfill path reconciles any missed node.
function patchNode(
  run: WorkflowRun,
  nodeId: string,
  update: (nr: NodeRun) => NodeRun,
): WorkflowRun {
  const nodeRuns = run.nodeRuns.map((nr) => (nr.nodeId === nodeId ? update(nr) : nr));
  return { ...run, nodeRuns };
}
