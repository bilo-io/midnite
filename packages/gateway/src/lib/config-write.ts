import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { deepMerge, findConfigPath } from '@midnite/shared/config-loader';

/**
 * The write side of `midnite.json`.
 *
 * Reads have always gone through `loadConfig()`; nothing ever wrote back, which
 * is why settings that live in config (notably `agent.poolEnabled`) had no
 * in-app surface — a fresh install could complete the setup wizard and still
 * never run a task, fixable only by hand-editing a file a desktop user doesn't
 * know exists.
 *
 * Writes are a **shallow-by-key deep merge onto the file on disk**, not a dump
 * of the resolved config: the loaded `MidniteConfig` has every zod default
 * filled in, so serialising it would bake ~700 lines of defaults into the user's
 * file and freeze them against future schema changes. Merging a small patch
 * keeps the file minimal and hand-editable.
 */

/** A JSON object as parsed from the config file. */
type PlainObject = Record<string, unknown>;

/**
 * Where a config write should land, in the same precedence the loader reads:
 *
 *   1. `$MIDNITE_CONFIG_PATH` — the explicit override; the packaged desktop app
 *      sets it when `~/.midnite/midnite.json` already exists.
 *   2. the nearest `midnite.json` walking up from cwd — the dev-checkout case.
 *   3. `~/.midnite/midnite.json` — the "one midnite per machine" home (Phase
 *      77). This is the branch a **fresh install** takes: the desktop app only
 *      passes `MIDNITE_CONFIG_PATH` when the file already exists, so on a clean
 *      machine there is nothing to find and nothing to write back to. Creating
 *      it here means the next launch loads it, and the in-memory mirror makes it
 *      take effect without waiting for one.
 */
export function resolveConfigWritePath(startDir: string = process.cwd()): string {
  const explicit = process.env['MIDNITE_CONFIG_PATH'];
  // An unset GitHub/shell variable expands to `''`, not undefined — treating
  // that as "explicit" would write to a bare `""` path.
  if (explicit && explicit.length > 0) return explicit;
  return findConfigPath(startDir) ?? join(homedir(), '.midnite', 'midnite.json');
}

/** Parse the config file at `path`, or `{}` when it's absent/unreadable/not an
 *  object. Callers merge onto this, so degrading to `{}` preserves the write
 *  rather than throwing away the user's change on a malformed file. */
export function readConfigFile(path: string): PlainObject {
  if (!existsSync(path)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Merge `patch` onto the config file at `path` and write it back, creating the
 * file (and its directory) when absent. Returns the JSON that was written so
 * callers can log or assert on it.
 *
 * Only the keys in `patch` are touched — every other setting the user has, plus
 * any comment-free formatting we can't preserve, round-trips through
 * `JSON.parse`/`stringify` unchanged in value.
 */
export function persistConfigPatch(path: string, patch: PlainObject): PlainObject {
  const merged = deepMerge(readConfigFile(path), patch) as PlainObject;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return merged;
}

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
