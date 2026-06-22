import { tmpdir } from 'node:os';

import { ChecksConfigSchema, type Check, type MidniteConfig } from '@midnite/shared';
import { describe, expect, it } from 'vitest';

import { ChecksService } from './checks.service';

/** A ChecksService backed by just the caps it reads from config. */
function service(overrides: Partial<{ perCheckTimeoutMs: number; outputCapBytes: number }> = {}) {
  const checks = ChecksConfigSchema.parse({ perCheckTimeoutMs: 5_000, outputCapBytes: 4_096, ...overrides });
  return new ChecksService({ checks } as unknown as MidniteConfig);
}

const ok: Check = { name: 'unit', command: 'exit 0' };
const fail: Check = { name: 'lint', command: 'exit 1' };

describe('ChecksService.run', () => {
  it('passes when every check passes, in a well-formed run', async () => {
    const run = await service().run('task-1', [ok, { name: 'build', command: 'echo built' }], tmpdir(), 'gate');
    expect(run).toMatchObject({ taskId: 'task-1', trigger: 'gate', passed: true });
    expect(run.id).toBeTruthy();
    expect(run.results).toHaveLength(2);
    expect(run.results.every((r) => r.passed)).toBe(true);
    expect(new Date(run.finishedAt).getTime()).toBeGreaterThanOrEqual(new Date(run.startedAt).getTime());
  });

  it('fails the run when any single check fails', async () => {
    const run = await service().run('task-2', [ok, fail], tmpdir(), 'manual');
    expect(run.passed).toBe(false);
    expect(run.trigger).toBe('manual');
    expect(run.results.find((r) => r.name === 'lint')?.passed).toBe(false);
  });

  it('runs checks sequentially and an empty set passes vacuously', async () => {
    const run = await service().run('task-3', [], tmpdir(), 'gate');
    expect(run.passed).toBe(true);
    expect(run.results).toEqual([]);
  });
});
