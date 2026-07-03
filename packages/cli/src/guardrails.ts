import type {
  ApprovalLogEntry,
  GuardrailCaps,
  GuardrailSettings,
  PauseScope,
} from '@midnite/shared';

import { dim, warn, success } from './lib/palette.js';

/** Act-path resolutions that count as a "denial" for `guardrails status`. */
const DENIAL_RESOLUTIONS = new Set(['deny', 'auto-deny']);

/**
 * Resolve the pause scope from mutually-exclusive `--repo` / `--team` flags.
 * No flag = global (the common case: "pause everything"). Passing both is an
 * error — a pause targets exactly one scope.
 */
export function parsePauseScope(opts: { repo?: string; team?: string }): PauseScope {
  const repo = opts.repo?.trim();
  const team = opts.team?.trim();
  if (repo && team) {
    throw new Error('pass at most one of --repo / --team (a pause targets one scope)');
  }
  if (repo) return { kind: 'repo', id: repo };
  if (team) return { kind: 'team', id: team };
  return { kind: 'global' };
}

/** A human label for a pause scope ("globally", "repo acme/api", "team t-7"). */
export function scopeLabel(scope: PauseScope): string {
  switch (scope.kind) {
    case 'global':
      return 'globally';
    case 'repo':
      return `repo ${scope.id}`;
    case 'team':
      return `team ${scope.id}`;
  }
}

/** One-line summary of the current pause state, coloured. */
export function pauseStateLine(g: GuardrailSettings): string {
  if (g.pausedGlobal) return warn('PAUSED globally — nothing is being scheduled');
  const scopes: string[] = [
    ...g.pausedRepos.map((r) => `repo ${r}`),
    ...g.pausedTeams.map((t) => `team ${t}`),
  ];
  if (scopes.length > 0) return warn(`paused: ${scopes.join(', ')}`);
  return success('active — no pauses');
}

/** `key/value` rows describing the configured caps + mode (for a table). */
export function capsRows(caps: GuardrailCaps): string[][] {
  const money = (v: number | null): string => (v == null ? dim('unset') : `$${v}`);
  const rate = caps.maxSpawnsPerHour > 0 ? `${caps.maxSpawnsPerHour}/hr` : dim('unlimited');
  return [
    ['Policy mode', caps.mode],
    ['Hard daily cap', money(caps.hardDailyCapUsd)],
    ['Hard monthly cap', money(caps.hardMonthlyCapUsd)],
    ['Soft daily budget', money(caps.softDailyBudgetUsd)],
    ['Soft monthly budget', money(caps.softMonthlyBudgetUsd)],
    ['Max spawns / hour', rate],
  ];
}

/** The most recent `limit` denials (deny / auto-deny), newest first. */
export function recentDenials(entries: ApprovalLogEntry[], limit = 10): ApprovalLogEntry[] {
  return entries.filter((e) => DENIAL_RESOLUTIONS.has(e.resolution)).slice(0, limit);
}

/** Table rows for the recent-denials section of `guardrails status`. */
export function denialRows(entries: ApprovalLogEntry[]): string[][] {
  return entries.map((e) => [
    dim(e.createdAt),
    e.toolName,
    warn(e.resolution),
    e.decidedBy,
    dim(e.sessionId.slice(0, 8)),
  ]);
}
