import { describe, expect, it } from 'vitest';

import {
  CheckRunSchema,
  ChecksConfigSchema,
  resolveChecksForRepo,
  type Check,
} from './checks.js';

describe('ChecksConfigSchema', () => {
  it('defaults to a disabled, empty gate set (back-compat)', () => {
    expect(ChecksConfigSchema.parse({})).toEqual({
      enabled: false,
      gates: [],
      byRepo: {},
      autoFix: { enabled: false, maxAttempts: 2 },
      perCheckTimeoutMs: 600_000,
      outputCapBytes: 16_384,
    });
  });

  it('parses a configured gate set with a per-repo override', () => {
    const parsed = ChecksConfigSchema.parse({
      enabled: true,
      gates: [{ name: 'test', command: 'pnpm test' }],
      byRepo: { web: [{ name: 'build', command: 'pnpm build', timeoutMs: 120_000 }] },
    });
    expect(parsed.enabled).toBe(true);
    expect(parsed.gates).toHaveLength(1);
    expect(parsed.byRepo['web']?.[0]?.timeoutMs).toBe(120_000);
  });

  it('rejects a non-positive timeout', () => {
    expect(() => ChecksConfigSchema.parse({ perCheckTimeoutMs: 0 })).toThrow();
  });
});

describe('CheckRunSchema', () => {
  it('round-trips a run with a killed (null exitCode) result', () => {
    const run = {
      id: 'r1',
      taskId: 't1',
      trigger: 'gate' as const,
      startedAt: '2026-06-22T00:00:00.000Z',
      finishedAt: '2026-06-22T00:00:01.000Z',
      passed: false,
      results: [
        { name: 'test', command: 'pnpm test', exitCode: null, passed: false, durationMs: 5, output: 'killed' },
      ],
    };
    expect(CheckRunSchema.parse(run)).toEqual(run);
  });

  it('rejects an unknown trigger', () => {
    expect(() =>
      CheckRunSchema.parse({
        id: 'r1',
        taskId: 't1',
        trigger: 'nope',
        startedAt: 'x',
        finishedAt: 'y',
        passed: true,
        results: [],
      }),
    ).toThrow();
  });
});

describe('resolveChecksForRepo', () => {
  const gates: Check[] = [{ name: 'test', command: 'pnpm test' }];
  const webChecks: Check[] = [{ name: 'build', command: 'pnpm build' }];
  const config = ChecksConfigSchema.parse({ enabled: true, gates, byRepo: { web: webChecks } });

  it('returns the global gates for a repo with no override', () => {
    expect(resolveChecksForRepo(config, 'gateway')).toEqual(gates);
  });

  it('returns the per-repo override (replacing, not merging) when present', () => {
    expect(resolveChecksForRepo(config, 'web')).toEqual(webChecks);
  });

  it('returns the global gates for a repo-less task (null/undefined)', () => {
    expect(resolveChecksForRepo(config, null)).toEqual(gates);
    expect(resolveChecksForRepo(config, undefined)).toEqual(gates);
  });

  it('returns an empty list when no gates are configured', () => {
    expect(resolveChecksForRepo(ChecksConfigSchema.parse({}), 'web')).toEqual([]);
  });
});
