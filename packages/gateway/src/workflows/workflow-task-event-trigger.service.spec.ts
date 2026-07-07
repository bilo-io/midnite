import { describe, expect, it, vi } from 'vitest';
import type { MidniteConfig, Task, TaskBoardEvent, Workflow } from '@midnite/shared';

import { TaskEventBus } from '../tasks/task-event-bus';
import type { WorkflowRow } from '../db/schema';
import type { WorkflowsRepository } from './workflows.repository';
import type { WorkflowEngine } from './engine/workflow-engine.service';
import { WorkflowTaskEventTriggerService } from './workflow-task-event-trigger.service';

function task(over: Partial<Task> = {}): Task {
  return { id: 't1', title: 'x', status: 'done', priority: 1, ...over } as unknown as Task;
}

const updated = (t: Task): TaskBoardEvent => ({ type: 'task.updated', at: 'now', task: t });

// A minimal workflow row + its hydrated trigger. `teamId` lives on the row.
function row(over: Partial<WorkflowRow> = {}): WorkflowRow {
  return { id: 'w1', teamId: null, ...over } as unknown as WorkflowRow;
}

function workflow(trigger: Workflow['trigger'], id = 'w1'): Workflow {
  return { id, name: 'wf', enabled: true, trigger, nodes: [], edges: [] } as unknown as Workflow;
}

type BuildOpts = {
  enabled?: boolean;
  rows?: WorkflowRow[];
  hydrate?: (r: WorkflowRow) => Workflow;
};

function build(opts: BuildOpts = {}) {
  const config = {
    workflows: { enabled: opts.enabled ?? true },
  } as unknown as MidniteConfig;
  const bus = new TaskEventBus();
  const startRun = vi.fn();
  const engine = { startRun } as unknown as WorkflowEngine;
  const hydrate =
    opts.hydrate ?? (() => workflow({ type: 'task-event', events: ['task.done'] }));
  const repo = {
    listTaskEventEnabledRows: vi.fn(() => opts.rows ?? [row()]),
    hydrateWorkflow: vi.fn(hydrate),
  } as unknown as WorkflowsRepository;
  const svc = new WorkflowTaskEventTriggerService(config, bus, repo, engine);
  svc.onApplicationBootstrap();
  return { bus, startRun, repo, svc };
}

describe('WorkflowTaskEventTriggerService', () => {
  it('fires a matching task-event workflow on a done task', () => {
    const { bus, startRun } = build();
    bus.emit(updated(task({ status: 'done' })));
    expect(startRun).toHaveBeenCalledTimes(1);
    expect(startRun.mock.calls[0][1]).toMatchObject({
      triggerSource: 'task-event',
      input: { event: 'task.done', task: { id: 't1' } },
    });
  });

  it('does not subscribe when workflows are disabled', () => {
    const { bus, startRun } = build({ enabled: false });
    bus.emit(updated(task({ status: 'done' })));
    expect(startRun).not.toHaveBeenCalled();
  });

  it('ignores an event the workflow did not subscribe to', () => {
    const { bus, startRun } = build({
      hydrate: () => workflow({ type: 'task-event', events: ['task.abandoned'] }),
    });
    bus.emit(updated(task({ status: 'done' })));
    expect(startRun).not.toHaveBeenCalled();
  });

  it('applies the trigger filter', () => {
    const { bus, startRun } = build({
      hydrate: () =>
        workflow({ type: 'task-event', events: ['task.done'], filter: { repo: 'acme/api' } }),
    });
    bus.emit(updated(task({ status: 'done', repo: 'other/repo' })));
    expect(startRun).not.toHaveBeenCalled();
    bus.emit(updated(task({ status: 'done', repo: 'acme/api' })));
    expect(startRun).toHaveBeenCalledTimes(1);
  });

  it('respects team-scope (a team-scoped workflow skips another team’s task)', () => {
    const { bus, startRun } = build({
      rows: [row({ teamId: 'team-a' })],
      hydrate: () => workflow({ type: 'task-event', events: ['task.done'] }),
    });
    bus.emit(updated(task({ status: 'done', teamId: 'team-b' })));
    expect(startRun).not.toHaveBeenCalled();
    bus.emit(updated(task({ status: 'done', teamId: 'team-a' })));
    expect(startRun).toHaveBeenCalledTimes(1);
  });

  it('is idempotent per (workflow, task, event) — a re-emitted done fires once', () => {
    const { bus, startRun } = build();
    const t = task({ status: 'done' });
    bus.emit(updated(t));
    bus.emit(updated(t));
    bus.emit(updated(t));
    expect(startRun).toHaveBeenCalledTimes(1);
  });

  it('fires again for a genuinely different event on the same task', () => {
    const { bus, startRun } = build({
      hydrate: () =>
        workflow({ type: 'task-event', events: ['task.done', 'task.abandoned'] }),
    });
    bus.emit(updated(task({ id: 't1', status: 'done' })));
    bus.emit(updated(task({ id: 't1', status: 'abandoned' })));
    expect(startRun).toHaveBeenCalledTimes(2);
  });

  it('ignores non-terminal + non-updated events', () => {
    const { bus, startRun } = build();
    bus.emit(updated(task({ status: 'wip' })));
    bus.emit({ type: 'task.deleted', at: 'now', id: 't1' });
    expect(startRun).not.toHaveBeenCalled();
  });

  it('fails open: a repo/engine error never propagates to the emitter', () => {
    const { bus } = build({
      hydrate: () => {
        throw new Error('boom');
      },
    });
    expect(() => bus.emit(updated(task({ status: 'done' })))).not.toThrow();
  });

  it('unsubscribes on destroy', () => {
    const { bus, startRun, svc } = build();
    svc.onModuleDestroy();
    bus.emit(updated(task({ status: 'done' })));
    expect(startRun).not.toHaveBeenCalled();
  });
});
