import { describe, expect, it, vi } from 'vitest';
import type { TaskSummary } from '@midnite/shared';
import type { NodeRunContext } from '../node-executor';
import type { DigestBuildRequest, DigestBuilderPort } from '../../../digests/digest-builder.port';
import { BuildDigestExecutor } from './build-digest.executor';

function ctx(params: Record<string, unknown>, input: unknown = {}): NodeRunContext {
  return {
    workflowId: 'w1',
    workflowCreatedBy: null,
    input,
    params,
    signal: new AbortController().signal,
    log: () => {},
  };
}

const RESULT = { digestId: 'd1', headline: 'h', markdown: '# d', blocks: [] };

function make(build = vi.fn(async (_req: DigestBuildRequest) => RESULT)) {
  const digests: DigestBuilderPort = { build };
  return { exec: new BuildDigestExecutor(digests), build };
}

const summary = (id: string): TaskSummary =>
  ({ id, title: id, status: 'done', priority: 1, retryCount: 0, tags: [] } as TaskSummary);

describe('BuildDigestExecutor', () => {
  it('declares the type id', () => {
    expect(make().exec.typeId).toBe('midnite.build-digest');
  });

  it('passes an upstream task list through to the builder', async () => {
    const { exec, build } = make();
    const tasks = [summary('a'), summary('b')];
    const out = (await exec.execute(ctx({ sinceHours: 24 }, { tasks }))) as typeof RESULT;
    expect(out.digestId).toBe('d1');
    expect(build.mock.calls[0]![0].tasks).toHaveLength(2);
  });

  it('omits tasks (builder re-queries) when the input has none', async () => {
    const { exec, build } = make();
    await exec.execute(ctx({ sinceHours: 24 }, {}));
    expect(build.mock.calls[0]![0].tasks).toBeUndefined();
  });

  it('honours explicit from/to over sinceHours', async () => {
    const { exec, build } = make();
    await exec.execute(ctx({ from: '2026-07-01T00:00:00.000Z', to: '2026-07-05T00:00:00.000Z' }));
    const arg = build.mock.calls[0]![0];
    expect(arg.from).toBe('2026-07-01T00:00:00.000Z');
    expect(arg.to).toBe('2026-07-05T00:00:00.000Z');
  });

  it('ignores a malformed upstream tasks value', async () => {
    const { exec, build } = make();
    await exec.execute(ctx({ sinceHours: 24 }, { tasks: 'not-an-array' }));
    expect(build.mock.calls[0]![0].tasks).toBeUndefined();
  });
});
