import type { BlastRadiusConfig } from '@midnite/shared';
import { globMatch } from './rule-evaluator';

/**
 * Phase 50 Theme C — the built-in destructive-action deny floor. A pure detector
 * over a single tool call: it matches the genuinely-dangerous operations an
 * unattended agent should never perform — force-pushes, protected-branch pushes,
 * recursive force-deletes, and secret/credential-file access — and returns a
 * typed hit (rule id + human reason) the approval path turns into an `auto-deny`.
 *
 * It is deliberately code-defined (not a user-editable `approval_rules` row) so
 * the floor can't be accidentally deleted, and it is checked BEFORE the mode
 * logic in `ApprovalsService.evaluate` so a match overrides even `autonomous`
 * mode. Detection is conservative: it errs toward matching an obviously-dangerous
 * command, and returns null (no opinion) on anything it can't confidently parse.
 */
export interface BlastRadiusHit {
  /** Stable id for the matched guard, logged to `approval_log` + the audit trail. */
  ruleId: string;
  /** Human-readable why, surfaced in the denial. */
  reason: string;
}

export function evaluateBlastRadius(
  toolName: string,
  toolInput: unknown,
  config: BlastRadiusConfig,
): BlastRadiusHit | null {
  if (!config.enabled) return null;

  const command = extractCommand(toolInput);
  if (command) {
    const hit = inspectCommand(command, config);
    if (hit) return hit;
  }

  // File-targeting tools (Read/Write/Edit/Glob/…): deny access to a protected path.
  const filePath = extractFilePath(toolInput);
  if (filePath && matchesProtectedPath(filePath, config.protectedPathGlobs)) {
    return {
      ruleId: 'blast-radius:secret-file',
      reason: `access to a protected path (${filePath})`,
    };
  }
  return null;
}

function inspectCommand(command: string, config: BlastRadiusConfig): BlastRadiusHit | null {
  const cmd = command.trim();

  if (isGitPush(cmd)) {
    if (hasForceFlag(cmd)) {
      return { ruleId: 'blast-radius:force-push', reason: 'force-push rewrites remote history' };
    }
    const branch = protectedBranchInPush(cmd, config.protectedBranches);
    if (branch) {
      return {
        ruleId: 'blast-radius:protected-branch',
        reason: `direct push to the protected branch "${branch}"`,
      };
    }
  }

  if (isRecursiveForceRm(cmd)) {
    return { ruleId: 'blast-radius:mass-delete', reason: 'recursive force delete (rm -rf)' };
  }

  // A shell command that references a protected file (e.g. `cat .env`, `cp id_rsa …`).
  const protectedToken = commandTokens(cmd).find((t) =>
    matchesProtectedPath(t, config.protectedPathGlobs),
  );
  if (protectedToken) {
    return {
      ruleId: 'blast-radius:secret-file',
      reason: `command references a protected path (${protectedToken})`,
    };
  }

  return null;
}

// A `git push` anywhere in the command (handles `git -C dir push`, `&&` chains).
function isGitPush(cmd: string): boolean {
  return /\bgit\b[^&|;]*\bpush\b/.test(cmd);
}

function hasForceFlag(cmd: string): boolean {
  return /(^|\s)(--force(-with-lease)?|-f)(\s|=|$)/.test(cmd);
}

/** The first protected branch named as a token in a push command, or null. */
function protectedBranchInPush(cmd: string, branches: string[]): string | null {
  const tokens = commandTokens(cmd);
  for (const branch of branches) {
    // `git push origin main` or `git push origin HEAD:main`.
    if (tokens.some((t) => t === branch || t.endsWith(`:${branch}`))) return branch;
  }
  return null;
}

// `rm` invoked with BOTH recursive and force (any flag spelling / order).
function isRecursiveForceRm(cmd: string): boolean {
  if (!/\brm\b/.test(cmd)) return false;
  const longForm = /--recursive\b/.test(cmd) && /--force\b/.test(cmd);
  // Short flags: -rf, -fr, -Rf, or separate -r … -f (allow other letters bundled in).
  const shortFlags = cmd.match(/(^|\s)-[a-zA-Z]*[rR][a-zA-Z]*[fF]|-[a-zA-Z]*[fF][a-zA-Z]*[rR]/);
  const separate = /(^|\s)-[a-zA-Z]*[rR]\b/.test(cmd) && /(^|\s)-[a-zA-Z]*[fF]\b/.test(cmd);
  return longForm || Boolean(shortFlags) || separate;
}

function matchesProtectedPath(path: string, globs: string[]): boolean {
  const clean = path.replace(/^['"]|['"]$/g, '');
  // The shared globMatch binds `**/` to a literal `/`, so a root-level file
  // (`.env`, `id_rsa`) wouldn't match `**/.env`. Also test a slash-prefixed form
  // so a `**/`-anchored pattern matches a file with no directory component.
  const withSlash = clean.startsWith('/') ? clean : `/${clean}`;
  return globs.some((g) => globMatch(g, clean) || globMatch(g, withSlash));
}

/** Split a shell command into rough tokens, stripping surrounding quotes. */
function commandTokens(cmd: string): string[] {
  return cmd
    .split(/[\s=]+/)
    .map((t) => t.replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function extractCommand(toolInput: unknown): string | null {
  if (!toolInput || typeof toolInput !== 'object') return null;
  const v = (toolInput as Record<string, unknown>)['command'];
  return typeof v === 'string' ? v : null;
}

function extractFilePath(toolInput: unknown): string | null {
  if (!toolInput || typeof toolInput !== 'object') return null;
  const inp = toolInput as Record<string, unknown>;
  const v = inp['file_path'] ?? inp['path'] ?? inp['pattern'];
  return typeof v === 'string' ? v : null;
}
