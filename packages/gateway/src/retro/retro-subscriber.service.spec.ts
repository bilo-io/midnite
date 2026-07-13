import { describe, expect, it, vi } from 'vitest';
import type { MidniteConfig, Task, TaskBoardEvent, TaskRetro } from '@midnite/shared';

import { TaskEventBus } from '../tasks/task-event-bus';
import { RetroSubscriberService } from './retro-subscriber.service';
import type { RetroBuilderService } from './retro-builder.service';

function task(over: Partial<Task> = {}): Task {
  return { id: 't1', title: 'x', status: 'done', createdAt: '2026-07-07T09:00:00.000Z', ...over } as unknown as Task;
}

function cfg(autoSkeleton = true): MidniteConfig {
  return { retro: { autoSkeleton, narrativeMaxTokens: 700 } } as unknown as MidniteConfig;
}

function build(builderOver: Partial<RetroBuilderService> = {}, autoSkeleton = true) {
  const bus = new TaskEventBus();
  const builder = {
    buildAndStore: vi.fn(),
    getByTaskId: vi.fn().mockReturnValue(undefined),
    ...builderOver,
  } as unknown as RetroBuilderService;
  const svc = new RetroSubscriberService(bus, builder, cfg(autoSkeleton));
  svc.onApplicationBootstrap();
  return { bus, builder, svc };
}

const updated = (t: Task): TaskBoardEvent => ({ type: 'task.updated', at: 'now', task: t });

describe('RetroSubscriberService', () => {
  it('builds a retro when a task transitions to done', () => {
    const { bus, builder } = build();
    bus.emit(updated(task({ status: 'done' })));
    expect(builder.buildAndStore).toHaveBeenCalledTimes(1);
  });

  it('builds a retro when a task is abandoned', () => {
    const { bus, builder } = build();
    bus.emit(updated(task({ status: 'abandoned' })));
    expect(builder.buildAndStore).toHaveBeenCalledTimes(1);
  });

  it('builds a retro when a task is escalated to needs-attention (waiting + failure reason)', () => {
    const { bus, builder } = build();
    bus.emit(updated(task({ status: 'waiting', waitReason: 'agent-failed' })));
    expect(builder.buildAndStore).toHaveBeenCalledTimes(1);
  });

  it('rebuilds when a needs-attention task later reaches a terminal outcome', () => {
    const existing = { outcome: 'needs-attention' } as TaskRetro;
    const { bus, builder } = build({ getByTaskId: vi.fn().mockReturnValue(existing) });
    bus.emit(updated(task({ status: 'done' })));
    expect(builder.buildAndStore).toHaveBeenCalledTimes(1);
  });

  it('ignores non-terminal updates (incl. waiting on live user input)', () => {
    const { bus, builder } = build();
    bus.emit(updated(task({ status: 'wip' })));
    bus.emit(updated(task({ status: 'waiting' }))); // no reason
    bus.emit(updated(task({ status: 'waiting', waitReason: 'needs-input' }))); // blocking on input, not escalated
    expect(builder.buildAndStore).not.toHaveBeenCalled();
  });

  it('ignores non-updated events', () => {
    const { bus, builder } = build();
    bus.emit({ type: 'task.deleted', at: 'now', id: 't1' });
    expect(builder.buildAndStore).not.toHaveBeenCalled();
  });

  it('is idempotent: skips when a retro for the same outcome already exists', () => {
    const existing = { outcome: 'done' } as TaskRetro;
    const { bus, builder } = build({ getByTaskId: vi.fn().mockReturnValue(existing) });
    bus.emit(updated(task({ status: 'done' })));
    expect(builder.buildAndStore).not.toHaveBeenCalled();
  });

  it('rebuilds on a genuine re-terminal (outcome changed)', () => {
    const existing = { outcome: 'abandoned' } as TaskRetro;
    const { bus, builder } = build({ getByTaskId: vi.fn().mockReturnValue(existing) });
    bus.emit(updated(task({ status: 'done' })));
    expect(builder.buildAndStore).toHaveBeenCalledTimes(1);
  });

  it('fails open: a build error never propagates to the emitter', () => {
    const { bus, builder } = build({
      buildAndStore: vi.fn(() => {
        throw new Error('boom');
      }),
    });
    expect(() => bus.emit(updated(task({ status: 'done' })))).not.toThrow();
    expect(builder.buildAndStore).toHaveBeenCalled();
  });

  it('unsubscribes on destroy', () => {
    const { bus, builder, svc } = build();
    svc.onModuleDestroy();
    bus.emit(updated(task({ status: 'done' })));
    expect(builder.buildAndStore).not.toHaveBeenCalled();
  });

  it('does not subscribe when retro.autoSkeleton is off', () => {
    const { bus, builder } = build({}, false);
    bus.emit(updated(task({ status: 'done' })));
    expect(builder.buildAndStore).not.toHaveBeenCalled();
  });
});
