import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OperatorConfigSchema, parseConfig, type MidniteConfig } from './config.js';

// Node-only config loader. Intentionally NOT re-exported from ./index.ts so the
// browser bundle (which imports the shared barrel) never pulls in `node:fs`.
// Consumers that run in node — the gateway, the CLI, the desktop main process —
// import it explicitly via `@midnite/shared/config-loader`.

// Empty objects so the schema fills in every default; matches the gateway's
// historical fallback behaviour.
const DEFAULTS = { agent: {}, terminal: {}, gateway: {} } as const;

/** Env var naming an explicit operator-config path (Phase 72 A). Overrides the
 * default `.midnite/operator.json`. When set, a missing file fails closed. */
export const OPERATOR_CONFIG_ENV = 'MIDNITE_OPERATOR_CONFIG';

/** Default operator-config file, relative to the config dir. `.midnite/` is
 * already gitignored, so the operator's auth wiring never lands in git. */
export const DEFAULT_OPERATOR_CONFIG_FILE = join('.midnite', 'operator.json');

/**
 * Thrown when the committed, user-facing `midnite.json` carries any `gateway.auth`
 * key (Phase 72 B). Auth is operator-owned — it must live in the gitignored
 * operator config, never in the file end users can read. A distinct class so
 * callers (the gateway boot) can refuse to fall back to defaults on this error.
 */
export class OperatorAuthInUserConfigError extends Error {
  constructor(keyPath: string) {
    super(
      `${keyPath} is operator-owned and must not appear in midnite.json — move the whole ` +
        `gateway.auth subtree to the operator config (.midnite/operator.json or ` +
        `$${OPERATOR_CONFIG_ENV}). See docs/SSO.md.`,
    );
    this.name = 'OperatorAuthInUserConfigError';
  }
}

type PlainObject = Record<string, unknown>;

function isPlainObject(v: unknown): v is PlainObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Recursively merge `override` onto `base` (plain objects only; arrays and scalars
 * from `override` replace, they don't concat). Neither input is mutated. Used to
 * layer the operator config's `gateway.auth` onto the user config before a single
 * final `parseConfig` fills defaults.
 */
export function deepMerge(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(override)) return override;
  const out: PlainObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = key in base ? deepMerge(base[key], value) : value;
  }
  return out;
}

/**
 * Walk up from `startDir` (default cwd) looking for midnite.json. Needed because
 * tasks often run from a package dir, not the repo root where the config lives —
 * a bare join(cwd, 'midnite.json') silently misses it and everything falls back
 * to schema defaults.
 */
export function findConfigPath(startDir: string = process.cwd()): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'midnite.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Resolve the operator-config path: `$MIDNITE_OPERATOR_CONFIG` (explicit) wins,
 * else `<baseDir>/.midnite/operator.json`. */
function resolveOperatorConfigPath(baseDir: string): { path: string; explicit: boolean } {
  const fromEnv = process.env[OPERATOR_CONFIG_ENV];
  if (fromEnv && fromEnv.length > 0) return { path: fromEnv, explicit: true };
  return { path: join(baseDir, DEFAULT_OPERATOR_CONFIG_FILE), explicit: false };
}

/** Where the operator config resolves to and whether it's present — for a
 * one-line boot log (the gateway logs "operator auth config loaded …"). */
export function operatorConfigInfo(baseDir: string = process.cwd()): {
  path: string;
  present: boolean;
} {
  const { path } = resolveOperatorConfigPath(baseDir);
  return { path, present: existsSync(path) };
}

/**
 * Load the operator config's raw JSON (Phase 72 A), resolved from
 * `$MIDNITE_OPERATOR_CONFIG` or `<baseDir>/.midnite/operator.json`. Returns the
 * raw object to deep-merge into the user config (so only keys the operator
 * actually set override — defaults are filled once by the final `parseConfig`),
 * or `null` when absent.
 *
 * Fail-closed: an **explicit** path that is missing throws (an operator named a
 * file that isn't there — a misconfig, never silently "auth off"); a present but
 * unparseable/invalid file throws for either source. A **missing default** file
 * is fine (returns null — SSO simply stays absent, exactly like before Phase 72).
 */
export function loadOperatorConfig(baseDir: string = process.cwd()): PlainObject | null {
  const { path, explicit } = resolveOperatorConfigPath(baseDir);
  if (!existsSync(path)) {
    if (explicit) {
      throw new Error(
        `operator config not found at ${path} (from $${OPERATOR_CONFIG_ENV}) — ` +
          `fix the path or unset the variable`,
      );
    }
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    throw new Error(`operator config at ${path} is not valid JSON`, { cause: err });
  }
  // Validate (throws on a bad shape) so an operator misconfig fails closed rather
  // than silently dropping auth; merge the RAW object so unset keys stay unset.
  OperatorConfigSchema.parse(raw);
  return isPlainObject(raw) ? raw : {};
}

/** Fail-closed (Phase 72 B): the user-facing `midnite.json` must not carry any
 * `gateway.auth` key — even an empty `{}`. */
function assertNoOperatorAuthInUserConfig(userRaw: unknown): void {
  if (
    isPlainObject(userRaw) &&
    isPlainObject(userRaw.gateway) &&
    'auth' in userRaw.gateway
  ) {
    throw new OperatorAuthInUserConfigError('gateway.auth');
  }
}

/**
 * Merge the operator config onto a raw user config and validate the result. The
 * one place the operator split happens: enforce the fail-closed boundary, layer
 * the operator's `gateway.auth` on top, then `parseConfig` once so the returned
 * `MidniteConfig` shape is byte-identical to the pre-split inline form.
 */
function buildConfig(userRaw: unknown, baseDir: string): MidniteConfig {
  assertNoOperatorAuthInUserConfig(userRaw);
  const operatorRaw = loadOperatorConfig(baseDir);
  const merged = operatorRaw ? deepMerge(userRaw, operatorRaw) : userRaw;
  return parseConfig(merged);
}

/**
 * Parse + validate a midnite.json at an explicit path, applying the operator
 * config merge (Phase 72). Throws on read/parse error, on a committed
 * `gateway.auth` (fail-closed), or on a broken operator file.
 */
export function loadConfigFromFile(path: string): MidniteConfig {
  const userRaw = JSON.parse(readFileSync(path, 'utf-8'));
  return buildConfig(userRaw, dirname(path));
}

/**
 * Resolve the runtime MidniteConfig: parse the file at `explicitPath` (or the
 * nearest ancestor's midnite.json), deep-merge the operator config, and fill
 * schema defaults. A missing/unparseable **user** file falls back to defaults
 * (unchanged pre-Phase-72 behaviour); a committed `gateway.auth` or a broken
 * **operator** file fails closed (throws) — an operator misconfig must never
 * silently degrade to "auth off".
 */
export function loadConfig(explicitPath?: string): MidniteConfig {
  const configPath = explicitPath ?? findConfigPath();
  const baseDir = configPath ? dirname(configPath) : process.cwd();
  let userRaw: unknown = DEFAULTS;
  if (configPath) {
    try {
      userRaw = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      userRaw = DEFAULTS; // missing/unparseable user file → defaults (as before)
    }
  }
  return buildConfig(userRaw, baseDir);
}
