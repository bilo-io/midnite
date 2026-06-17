import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseConfig, type MidniteConfig } from './config.js';

// Node-only config loader. Intentionally NOT re-exported from ./index.ts so the
// browser bundle (which imports the shared barrel) never pulls in `node:fs`.
// Consumers that run in node — the gateway, the CLI, the desktop main process —
// import it explicitly via `@midnite/shared/config-loader`.

// Empty objects so the schema fills in every default; matches the gateway's
// historical fallback behaviour.
const DEFAULTS = { agent: {}, terminal: {}, knowledge: {}, gateway: {} } as const;

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

/** Parse + validate a midnite.json at an explicit path. Throws on read/parse error. */
export function loadConfigFromFile(path: string): MidniteConfig {
  return parseConfig(JSON.parse(readFileSync(path, 'utf-8')));
}

/**
 * Resolve the runtime MidniteConfig: parse the file at `explicitPath` (or the
 * nearest ancestor's midnite.json), falling back to schema defaults when it's
 * missing or unparseable. Pure of side effects beyond reading the file — the
 * gateway wraps this with its own logging.
 */
export function loadConfig(explicitPath?: string): MidniteConfig {
  const configPath = explicitPath ?? findConfigPath();
  if (!configPath) return parseConfig(DEFAULTS);
  try {
    return loadConfigFromFile(configPath);
  } catch {
    return parseConfig(DEFAULTS);
  }
}
