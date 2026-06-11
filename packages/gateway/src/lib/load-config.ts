import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseConfig, type MidniteConfig } from '@midnite/shared';

/**
 * Walk up from the cwd to find the project's midnite.json. Needed because moon
 * runs the gateway task from packages/gateway, not the repo root where the
 * config lives — a bare join(cwd, 'midnite.json') silently misses it and the
 * whole app falls back to schema defaults.
 */
export function findConfigPath(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'midnite.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const DEFAULTS = { agent: {}, terminal: {}, knowledge: {}, gateway: {} } as const;

/**
 * Load and validate midnite.json from the nearest ancestor of the cwd, falling
 * back to schema defaults when it's missing or unparseable. This is the single
 * source of the runtime MidniteConfig — both the bootstrap (main.ts) and the
 * DI provider (ConfigModule) go through here so they never disagree.
 */
export function loadConfigFromDisk(): MidniteConfig {
  const configPath = findConfigPath();
  if (!configPath) {
    // eslint-disable-next-line no-console
    console.warn(
      `[midnite gateway] no midnite.json found from ${process.cwd()} upward — using defaults`,
    );
    return parseConfig(DEFAULTS);
  }
  try {
    const config = parseConfig(JSON.parse(readFileSync(configPath, 'utf-8')));
    // eslint-disable-next-line no-console
    console.log(`[midnite gateway] loaded config from ${configPath}`);
    return config;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[midnite gateway] failed to parse ${configPath} — using defaults`, err);
    return parseConfig(DEFAULTS);
  }
}
