import { spawn } from 'node:child_process';
import { isAbsolute, resolve } from 'node:path';

import type { Check, CheckResult } from '@midnite/shared';

export type RunCheckOptions = {
  /** The task's repo working directory; checks run here (or a repo-relative `check.cwd`). */
  cwd: string;
  /** Timeout used when the check sets no `timeoutMs` of its own. */
  defaultTimeoutMs: number;
  /** Tail-truncate combined stdout+stderr to about this many bytes. */
  outputCapBytes: number;
};

/**
 * Keep the last `cap` bytes of `text`, prefixed with a short truncation note when
 * cut (so the result is `cap` bytes + the note — an approximate, not hard, cap).
 */
function capTail(text: string, cap: number): string {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= cap) return text;
  const dropped = buf.length - cap;
  return `[…truncated ${dropped} bytes]\n${buf.subarray(dropped).toString('utf8')}`;
}

/**
 * Run one check to completion and report a structured {@link CheckResult}. The
 * command is run via `/bin/sh -c` so a normal shell command string works as
 * written, in a **detached process group** so a timeout can kill the whole group
 * (the shell *and* any child it forked — e.g. `sleep` — which would otherwise
 * keep the output pipes open and stall `close`). On timeout the group is SIGKILL'd
 * and the result resolves immediately (`passed: false`, `exitCode: null`). We use
 * `spawn` + a manual byte cap rather than `execFile`'s `maxBuffer`, so large output
 * is *truncated*, not turned into an error.
 *
 * **Never rejects**: a spawn failure (e.g. a missing cwd) or a timeout becomes a
 * failed result, so the gate path never sees an unhandled rejection.
 */
export function runCheck(check: Check, opts: RunCheckOptions): Promise<CheckResult> {
  const timeoutMs = check.timeoutMs ?? opts.defaultTimeoutMs;
  const cwd = check.cwd
    ? isAbsolute(check.cwd)
      ? check.cwd
      : resolve(opts.cwd, check.cwd)
    : opts.cwd;
  const start = Date.now();

  return new Promise<CheckResult>((resolvePromise) => {
    let output = '';
    let settled = false;

    const finish = (exitCode: number | null, note?: string): void => {
      if (settled) return;
      settled = true;
      if (note) output += note;
      resolvePromise({
        name: check.name,
        command: check.command,
        exitCode,
        passed: exitCode === 0,
        durationMs: Date.now() - start,
        output: capTail(output, opts.outputCapBytes),
      });
    };

    let child;
    try {
      child = spawn('/bin/sh', ['-c', check.command], { cwd, detached: true });
    } catch (err) {
      finish(null, `failed to spawn: ${(err as Error).message}`);
      return;
    }

    const timeout = setTimeout(() => {
      // Kill the whole process group (negative pid) so a forked grandchild dies
      // too and doesn't hold the pipes open past `close`.
      try {
        if (child.pid) process.kill(-child.pid, 'SIGKILL');
      } catch {
        // Already exited — nothing to kill.
      }
      finish(null, `\n[killed: exceeded ${timeoutMs}ms timeout]`);
    }, timeoutMs);

    const append = (chunk: Buffer): void => {
      output += chunk.toString('utf8');
    };
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    // Async spawn failures (missing cwd → ENOENT, etc.).
    child.on('error', (err) => {
      clearTimeout(timeout);
      finish(null, `failed to spawn: ${err.message}`);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      finish(code);
    });
  });
}
