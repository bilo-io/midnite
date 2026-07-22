import { spawnSync } from 'node:child_process';

/**
 * A Finder/Dock-launched app inherits launchd's bare PATH
 * (`/usr/bin:/bin:/usr/sbin:/sbin`), not the user's shell PATH — so the
 * embedded gateway (a child of this process) can't find `claude`, `tmux`, or
 * anything installed via Homebrew/`~/.local/bin`. Agent spawns then die
 * instantly (exit 1, no output) and the task crash-loops back to `todo`,
 * while the Settings environment checker looks green because its probe runs
 * through a login shell (`detectCli`).
 *
 * The fix mirrors the checker: ask the user's login shell for its PATH once at
 * boot and fold it into `process.env.PATH` before the gateway is spawned.
 */

/** Wrapped around `$PATH` so profile noise (motd, nvm banners) can't corrupt the parse. */
const MARKER_START = '__MIDNITE_PATH_START__';
const MARKER_END = '__MIDNITE_PATH_END__';

/** How long to wait for the login shell before shipping without the fix. */
const RESOLVE_TIMEOUT_MS = 5000;

/** Extract the PATH between the markers (last occurrence wins, in case a
 *  profile echoes the command line). Pure/exported for testing. */
export function parseShellPathOutput(output: string): string | null {
  const start = output.lastIndexOf(MARKER_START);
  if (start === -1) return null;
  const from = start + MARKER_START.length;
  const end = output.indexOf(MARKER_END, from);
  if (end === -1) return null;
  const path = output.slice(from, end).trim();
  return path.length > 0 ? path : null;
}

/** The login-shell PATH first (the user's real ordering), then any current
 *  entries it lacks — never drops a dir the process already had. Pure/exported
 *  for testing. */
export function mergePath(current: string | undefined, resolved: string): string {
  const seen = new Set(resolved.split(':'));
  const extras = (current ?? '').split(':').filter((dir) => dir.length > 0 && !seen.has(dir));
  return [resolved, ...extras].join(':');
}

/**
 * PATH as the user's login shell sees it, or null when it can't be resolved
 * (Windows GUI apps already inherit the full user PATH; any shell error/timeout
 * fails soft). `-lc` matches the gateway's `detectCli` probe, so the spawn PATH
 * and the environment checker finally agree.
 */
export function resolveLoginShellPath(): string | null {
  if (process.platform === 'win32') return null;
  const shell =
    process.env['SHELL'] ?? (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
  // Braces around ${PATH} — a bare $PATH would swallow the end marker as part
  // of the variable name (`$PATH__MIDNITE...` is a valid, unset identifier).
  const probe = `printf '%s' "${MARKER_START}\${PATH}${MARKER_END}"`;
  const res = spawnSync(shell, ['-lc', probe], {
    encoding: 'utf-8',
    timeout: RESOLVE_TIMEOUT_MS,
  });
  if (res.error || res.status !== 0) return null;
  return parseShellPathOutput(res.stdout ?? '');
}

/** Fold the login-shell PATH into this process's env (inherited by the gateway
 *  and every PTY it spawns). No-op when resolution fails — boot must never hang
 *  or die on a broken shell profile. */
export function ensureLoginShellPath(): void {
  const resolved = resolveLoginShellPath();
  if (!resolved) return;
  process.env['PATH'] = mergePath(process.env['PATH'], resolved);
}
