import { describe, expect, it, vi } from 'vitest';
import type { NodeRunContext } from '../node-executor';
import type { Notifier, NotifyInput } from '../../../notifications/notifier';
import { NotifyExecutor } from './notify.executor';

function ctx(params: Record<string, unknown>): NodeRunContext {
  return { workflowId: 'w1', workflowCreatedBy: 'u1', input: {}, params, signal: new AbortController().signal, log: () => {} };
}

function make() {
  const notify = vi.fn(async (_i: NotifyInput) => {});
  const notifier: Notifier = { notify };
  return { exec: new NotifyExecutor(notifier), notify };
}

describe('NotifyExecutor', () => {
  it('posts a digest notification with a default /ops route', async () => {
    const { exec, notify } = make();
    await exec.execute(ctx({ kind: 'digest.generated', title: 'Digest ready', body: '3 shipped', entityId: 'd1' }));
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'digest.generated', entityType: 'digest', route: '/ops', entityId: 'd1', title: 'Digest ready' }),
    );
  });

  it('posts a retro notification with a default /tasks route', async () => {
    const { exec, notify } = make();
    await exec.execute(ctx({ kind: 'retro.notable', title: 'Task abandoned', severity: 'warn' }));
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'retro.notable', entityType: 'task', route: '/tasks', severity: 'warn' }),
    );
  });

  it('rejects an empty title (schema-validated)', async () => {
    const { exec, notify } = make();
    await expect(exec.execute(ctx({ kind: 'digest.generated', title: '' }))).rejects.toThrow();
    expect(notify).not.toHaveBeenCalled();
  });
});
