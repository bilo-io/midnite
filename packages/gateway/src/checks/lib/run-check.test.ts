import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { runCheck } from './run-check';

const opts = { cwd: tmpdir(), defaultTimeoutMs: 5_000, outputCapBytes: 16_384 };

describe('runCheck', () => {
  it('passes a zero-exit command and captures output', async () => {
    const r = await runCheck({ name: 'ok', command: 'echo hello' }, opts);
    expect(r).toMatchObject({ name: 'ok', exitCode: 0, passed: true });
    expect(r.output).toContain('hello');
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('fails a non-zero-exit command and records the exit code', async () => {
    const r = await runCheck({ name: 'nope', command: 'exit 3' }, opts);
    expect(r).toMatchObject({ exitCode: 3, passed: false });
  });

  it('captures stderr too', async () => {
    const r = await runCheck({ name: 'err', command: 'echo boom 1>&2; exit 1' }, opts);
    expect(r.passed).toBe(false);
    expect(r.output).toContain('boom');
  });

  it('kills a check that exceeds its timeout (exitCode null, failed)', async () => {
    const r = await runCheck({ name: 'slow', command: 'sleep 5', timeoutMs: 150 }, opts);
    expect(r).toMatchObject({ exitCode: null, passed: false });
    expect(r.output).toContain('killed');
    expect(r.durationMs).toBeLessThan(4_000);
  });

  it('reports a spawn failure (missing cwd) as a failed result, never throwing', async () => {
    const r = await runCheck(
      { name: 'bad-cwd', command: 'echo hi' },
      { ...opts, cwd: '/no/such/dir/xyz-123' },
    );
    expect(r).toMatchObject({ exitCode: null, passed: false });
    expect(r.output).toContain('failed to spawn');
  });

  it('tail-truncates output to the configured cap', async () => {
    const r = await runCheck(
      { name: 'big', command: 'yes A | head -c 5000' },
      { ...opts, outputCapBytes: 200 },
    );
    expect(r.passed).toBe(true);
    expect(r.output).toContain('truncated');
    // capped to the tail (cap + the short truncation note), nowhere near 5000
    expect(Buffer.byteLength(r.output, 'utf8')).toBeLessThan(400);
  });
});
