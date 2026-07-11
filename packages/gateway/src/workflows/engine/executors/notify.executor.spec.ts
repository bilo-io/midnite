import { describe, expect, it, vi } from 'vitest';
import type { NodeRunContext } from '../node-executor';
import type { Notifier } from '../../../notifications/notifier';
import { NotifyExecutor } from './notify.executor';

function ctx(params: Record<string, unknown>): NodeRunContext {
  return {
    workflowId: 'w1',
    workflowCreatedBy: null,
    input: {},
    params,
    signal: new AbortController().signal,
    log: () => {},
  };
}

function make(notify = vi.fn(async () => {})) {
  const notifier: Notifier = { notify };
  return { exec: new NotifyExecutor(notifier), notify };
}

describe('NotifyExecutor', () => {
  it('declares the type id', () => {
    expect(make().exec.typeId).toBe('midnite.notify');
  });

  it('posts a notification with the given fields', async () => {
    const { exec, notify } = make();
    const out = (await exec.execute(
      ctx({ kind: 'digest.generated', severity: 'info', title: 'Digest ready', body: 'See it', entityId: 'd1', route: '/digests' }),
    )) as { notified: boolean };
    expect(out.notified).toBe(true);
    expect(notify).toHaveBeenCalledWith({
      kind: 'digest.generated',
      severity: 'info',
      title: 'Digest ready',
      body: 'See it',
      entityId: 'd1',
      route: '/digests',
    });
  });

  it('defaults the route + entityId per kind', async () => {
    const { exec, notify } = make();
    await exec.execute(ctx({ kind: 'retro.notable', title: 'Look', body: 'Notable retro' }));
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'retro.notable', route: '/tasks', entityId: 'retro.notable', severity: 'info' }),
    );
  });

  it('rejects a missing title (schema-validated)', async () => {
    const { exec, notify } = make();
    await expect(exec.execute(ctx({ kind: 'digest.generated', body: 'x' }))).rejects.toThrow();
    expect(notify).not.toHaveBeenCalled();
  });
});
