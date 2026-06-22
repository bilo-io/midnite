import { spawn } from 'node:child_process';
import { isAbsolute, resolve } from 'node:path';

import type { Check, CheckResult } from '@midnite/shared';

export type RunCheckOptions = {
  /** The task's repo working directory; checks run here (or a repo-relative `check.cwd`). */
  cwd: string;
  /** Timeout used when the check sets no `timeoutMs` of its own. */
  defaultTimeoutMs: number;
  /** Tail-truncate combined stdout+stderr to this many bytes. */
  outputCapBytes: number;
};

/** Keep the last `cap` bytes of `text`, prefixed with a truncation note when cut. */
function capTail(text: string, cap: number): string {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= cap) return text;
  const dropped = buf.length - cap;
  return `[…truncated ${dropped} bytes]\n${buf.subarray(dropped).toString('utf8')}`;
}

/**
 * Run one check to completion and report a structured {@link CheckResult}. The
 * command is run via `/bin/sh -c` so a normal shell command string works as
 * written. `spawn`'s own `timeout`/`killSignal` bounds the run — on timeout Node
 * SIGKILLs the child and `close` fires with a null exit code (→ `passed: false`).
 * We use `spawn` + a manual byte cap rather than `execFile`'s `maxBuffer`, so
 * large output is *truncated*, not turned into an error.
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
      child = spawn('/bin/sh', ['-c', check.command], {
        cwd,
        timeout: timeoutMs,
        killSignal: 'SIGKILL',
      });
    } catch (err) {
      finish(null, `failed to spawn: ${(err as Error).message}`);
      return;
    }

    const append = (chunk: Buffer): void => {
      output += chunk.toString('utf8');
    };
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    // Async spawn failures (missing cwd → ENOENT, etc.).
    child.on('error', (err) => finish(null, `failed to spawn: ${err.message}`));
    child.on('close', (code, signal) => {
      if (code === null) {
        finish(null, `\n[killed${signal ? ` (${signal})` : ''}: exceeded ${timeoutMs}ms timeout]`);
      } else {
        finish(code);
      }
    });
  });
}
