import { accessSync, constants, statSync } from 'node:fs';
import { delimiter, isAbsolute, join, resolve } from 'node:path';

/**
 * Pure environment probes for the boot preflight + readiness checks (Phase 54).
 * No Nest, no DI — just "is X present/usable", so they're trivially unit-testable
 * and safe to call fail-open.
 */

/**
 * Whether an executable named `cmd` is resolvable on `PATH`. Scans PATH dirs for
 * an executable file rather than spawning `which` (no subprocess, no shell). On
 * a bare name only; an absolute/relative path is checked directly.
 */
export function commandExists(cmd: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (cmd.includes('/')) return isExecutableFile(cmd);
  const path = env['PATH'] ?? '';
  const exts = process.platform === 'win32' ? (env['PATHEXT'] ?? '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of path.split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      if (isExecutableFile(join(dir, cmd + ext))) return true;
    }
  }
  return false;
}

function isExecutableFile(p: string): boolean {
  try {
    if (!statSync(p).isFile()) return false;
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Whether the given directory exists, is a directory, and is writable. */
export function dirWritable(dir: string): boolean {
  try {
    const abs = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
    if (!statSync(abs).isDirectory()) return false;
    accessSync(abs, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** Whether a path exists (file or dir). */
export function pathExists(p: string): boolean {
  try {
    statSync(isAbsolute(p) ? p : resolve(process.cwd(), p));
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether the native `node-pty` module loads — the `pty` terminal backend's
 * availability. Mirrors PtySpawner's lazy `require`, but read-only (a broken
 * native build makes this false without disabling anything).
 */
export function nodePtyLoads(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node-pty');
    return true;
  } catch {
    return false;
  }
}
