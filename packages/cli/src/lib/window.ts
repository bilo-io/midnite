// Phase 61 I — shared time-window resolution for the `usage`/`ops` commands.
// `--since <dur>` is a convenience (relative to now) that maps to the endpoints'
// native `from`/`to` ISO params; explicit `--from`/`--to` win when both are given.

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/**
 * Parse a compact duration like `30s`, `90m`, `24h`, `7d`, `2w` into milliseconds.
 * Throws on a malformed value so the CLI can surface a clear usage error.
 */
export function parseDurationToMs(raw: string): number {
  const m = /^(\d+)\s*([smhdw])$/.exec(raw.trim());
  if (!m) {
    throw new Error(`invalid duration "${raw}" — use <number><unit>, e.g. 24h, 7d, 90m`);
  }
  return Number(m[1]) * UNIT_MS[m[2]!]!;
}

export interface WindowOpts {
  since?: string;
  from?: string;
  to?: string;
}

/**
 * Resolve window flags to `{ from?, to? }` ISO timestamps. Explicit `--from`/`--to`
 * take precedence; otherwise `--since <dur>` sets `from = now - dur`. `nowMs` is
 * injectable for deterministic tests.
 */
export function resolveWindow(opts: WindowOpts, nowMs: number = Date.now()): { from?: string; to?: string } {
  const out: { from?: string; to?: string } = {};
  if (opts.since && !opts.from) {
    out.from = new Date(nowMs - parseDurationToMs(opts.since)).toISOString();
  }
  if (opts.from) out.from = opts.from;
  if (opts.to) out.to = opts.to;
  return out;
}
