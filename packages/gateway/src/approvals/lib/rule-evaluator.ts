import type { ApprovalRuleMatch } from '@midnite/shared';
import type { ApprovalRuleRow } from '../../db/schema';

export type EvaluationVerdict = 'auto-allow' | 'auto-deny' | 'escalate';

/**
 * Evaluate a set of enabled, pre-fetched rules against a tool call.
 * Rules are evaluated in insertion order; first match wins.
 * Returns 'escalate' when no rule matches (fail-safe default).
 *
 * Decision §2 conservative contract:
 *   - `commandPrefix` for Bash: the command must *start with* a listed prefix — exact prefix, no fuzzy.
 *   - `pathGlob` for file tools: the file_path must match a listed glob pattern.
 *   - A rule with no `match` conditions matches unconditionally.
 *   - Any input shape mismatch (no command string, no file_path) is treated as unmatched → escalate.
 */
export function evaluateRules(
  rules: ApprovalRuleRow[],
  toolName: string,
  toolInput: unknown,
): EvaluationVerdict {
  for (const rule of rules) {
    if (!ruleMatches(rule, toolName, toolInput)) continue;
    return rule.effect === 'allow' ? 'auto-allow' : 'auto-deny';
  }
  return 'escalate';
}

function ruleMatches(rule: ApprovalRuleRow, toolName: string, toolInput: unknown): boolean {
  if (rule.toolName !== '*' && rule.toolName !== toolName) return false;
  if (!rule.match) return true;

  const match = JSON.parse(rule.match) as ApprovalRuleMatch;

  // commandPrefix — only relevant for Bash-style tool calls
  if (match.commandPrefix?.length) {
    const cmd = extractCommand(toolInput);
    if (!cmd) return false;
    const matches = match.commandPrefix.some((prefix) => cmd.trimStart().startsWith(prefix));
    if (!matches) return false;
  }

  // pathGlob — for file-targeting tools (Read, Write, Edit, Glob, Find, …)
  if (match.pathGlob?.length) {
    const filePath = extractFilePath(toolInput);
    if (!filePath) return false;
    const matches = match.pathGlob.some((pattern) => globMatch(pattern, filePath));
    if (!matches) return false;
  }

  return true;
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

/**
 * Minimal glob matcher: `*` matches any non-separator chars, `**` matches
 * anything (including `/`). No dependency on external packages. Exported so the
 * blast-radius detector (Phase 50 C) matches protected paths the same way.
 */
export function globMatch(pattern: string, str: string): boolean {
  const re = new RegExp(
    '^' +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials
        .replace(/\*\*/g, '\x00') // placeholder for **
        .replace(/\*/g, '[^/]*') // * = non-slash segment
        .replace(/\x00/g, '.*') + // ** = anything
      '$',
  );
  return re.test(str);
}
