import { describe, expect, it, vi } from 'vitest';
import type { Digest } from '@midnite/shared';
import type { NodeRunContext } from '../node-executor';
import type { DigestBuilderService, BuildDigestInput } from '../../../digest/digest-builder.service';
import { BuildDigestExecutor } from './build-digest.executor';

const fakeDigest = (): Digest => ({
  id: 'd1',
  createdAt: '2026-07-11T08:00:00.000Z',
  window: { from: 'a', to: 'b' },
  groupBy: 'repo',
  counts: { shipped: 2, failed: 1, needsAttention: 0, total: 3 },
  sections: [],
  highlights: [],
  spend: null,
  cycle: null,
  headline: { headline: 'A busy day.', generatedBy: 'llm' },
  markdown: '# Fleet digest',
});

function ctx(params: Record<string, unknown>, input: unknown): NodeRunContext {
  return { workflowId: 'w1', workflowCreatedBy: 'u1', input, params, signal: new AbortController().signal, log: () => {} };
}

function make() {
  const build = vi.fn(async (_i: BuildDigestInput) => fakeDigest());
  const svc = { build } as unknown as DigestBuilderService;
  return { exec: new BuildDigestExecutor(svc), build };
}

describe('BuildDigestExecutor', () => {
  it('passes upstream tasks + window + groupBy to the builder', async () => {
    const { exec, build } = make();
    const input = { tasks: [{ id: 't1', title: 'x', status: 'done' }], window: { from: 'w0', to: 'w1' } };
    await exec.execute(ctx({ groupBy: 'project' }, input));
    const arg = build.mock.calls[0]![0] as BuildDigestInput;
    expect(arg.groupBy).toBe('project');
    expect(arg.window).toEqual({ from: 'w0', to: 'w1' });
    expect(arg.tasks).toHaveLength(1);
  });

  it('returns the digest id, markdown, headline text, and counts', async () => {
    const { exec } = make();
    const out = (await exec.execute(ctx({}, { tasks: [], window: { from: 'a', to: 'b' } }))) as {
      digestId: string;
      markdown: string;
      headline: string | null;
      counts: { total: number };
    };
    expect(out.digestId).toBe('d1');
    expect(out.markdown).toBe('# Fleet digest');
    expect(out.headline).toBe('A busy day.');
    expect(out.counts.total).toBe(3);
  });

  it('falls back to a derived window when the input carries none', async () => {
    const { exec, build } = make();
    await exec.execute(ctx({}, { tasks: [{ id: 't1', title: 'x', status: 'done', updatedAt: '2026-07-05T00:00:00.000Z' }] }));
    const arg = build.mock.calls[0]![0] as BuildDigestInput;
    expect(arg.window.to).toBe('2026-07-05T00:00:00.000Z');
  });
});
