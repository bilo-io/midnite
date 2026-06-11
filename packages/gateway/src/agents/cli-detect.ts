import { execFile } from 'node:child_process';

/** How long to wait for a `--version` probe before declaring the CLI absent. */
const DETECT_TIMEOUT_MS = 5000;

/**
 * Pull a version string out of a CLI's `--version` output. Prefers a semver-ish
 * token (e.g. `1.2.3` from `1.2.3 (Claude Code)`); falls back to the trimmed
 * first non-empty line. Pure/exported for testing.
 */
export function parseVersion(stdout: string): string | undefined {
  const semver = stdout.match(/\d+\.\d+\.\d+(?:[-+][\w.]+)?/);
  if (semver) return semver[0];
  const firstLine = stdout.split('\n').map((l) => l.trim()).find((l) => l.length > 0);
  return firstLine || undefined;
}

/**
 * Probe whether a CLI binary is on PATH (and, best-effort, its version) through a
 * login shell — `-lc` so it sources the user's profile and sees the same PATH
 * (nvm/volta/homebrew/pip) the session terminal would. Existence is decided by
 * `command -v` rather than `--version`, since not every CLI (e.g. Aider,
 * OpenCode) supports a version flag uniformly. Fail-soft: any error reports
 * `installed: false`.
 */
export function detectCli(command: string): Promise<{ installed: boolean; version?: string }> {
  const shell = process.env['SHELL'] ?? '/bin/bash';
  // Bail (exit 1 → installed:false) if the binary isn't found; otherwise print
  // its version if it has one (empty output is fine — installed without a version).
  const probe = `command -v ${command} >/dev/null 2>&1 || exit 1; ${command} --version 2>/dev/null || true`;
  return new Promise((resolve) => {
    execFile(shell, ['-lc', probe], { timeout: DETECT_TIMEOUT_MS }, (err, stdout) => {
      if (err) {
        resolve({ installed: false });
        return;
      }
      resolve({ installed: true, version: parseVersion(stdout) });
    });
  });
}
