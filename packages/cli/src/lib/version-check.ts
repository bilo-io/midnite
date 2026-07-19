import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isBelowFloor, isUpdateAvailable, VersionManifestSchema, type VersionManifest } from '@midnite/shared';

import { getVersion } from './brand.js';
import { isJsonMode } from './output.js';
import { error as paintError, warn } from './palette.js';

// A startup "your CLI is out of date" heads-up (Phase 71 Theme H). Fail-soft +
// cached so it never slows a command or breaks offline use, and suppressible.
// The CLI has no web origin, so it reads the published manifest straight from
// GitHub-raw (the same file Theme G commits under packages/web/public) — no
// gateway round-trip. Fetched from the PUBLIC mirror repo (not the private source)
// so it keeps resolving anonymously once the source repo is private: the
// `sync-public-assets` workflow mirrors `packages/web/public/version.json` there on
// every `main` push.

/** Where the published `version.json` lives (GitHub-raw, public mirror). Overridable for tests / self-hosting. */
export const DEFAULT_VERSION_URL =
  'https://raw.githubusercontent.com/bilo-io/midnite-app/main/packages/web/public/version.json';

/** Cache the manifest here so at most one fetch happens per {@link CACHE_TTL_MS}. */
export const CACHE_FILE = path.join(os.tmpdir(), 'midnite-version-check.json');
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const FETCH_TIMEOUT_MS = 1500;

export function versionCheckUrl(): string {
  return process.env['MIDNITE_VERSION_URL'] ?? DEFAULT_VERSION_URL;
}

/**
 * The check is suppressed by `MIDNITE_NO_UPDATE_CHECK` (any truthy value), a
 * `--no-update-check` flag, or `--json` mode (structured output must stay clean).
 */
export function isSuppressed(argv: readonly string[] = process.argv): boolean {
  if (process.env['MIDNITE_NO_UPDATE_CHECK']) return true;
  if (argv.includes('--no-update-check')) return true;
  return isJsonMode();
}

type NoticeLevel = 'floor' | 'behind';
export type UpdateNotice = { level: NoticeLevel; message: string };

/**
 * Build the notice for a CLI version against a manifest, or `null` when up to
 * date. A build below `minSupported` gets a **floor** (hard) notice; merely behind
 * the latest gets a **behind** (soft) one. Pure + exported for tests.
 */
export function buildNotice(current: string, manifest: VersionManifest): UpdateNotice | null {
  if (isBelowFloor(current, manifest.minSupported)) {
    return {
      level: 'floor',
      message: `midnite CLI v${current} is below the minimum supported v${manifest.minSupported}. Update now: npm i -g @midnite/cli`,
    };
  }
  if (isUpdateAvailable(current, manifest.version)) {
    return {
      level: 'behind',
      message: `midnite CLI v${current} is behind v${manifest.version}. Update: npm i -g @midnite/cli`,
    };
  }
  return null;
}

/** Render a notice with the Phase 47 chrome — floor is loud (red), behind is a soft warn. */
export function renderNotice(notice: UpdateNotice): string {
  return notice.level === 'floor' ? paintError(notice.message) : warn(notice.message);
}

type CacheEntry = { fetchedAt: number; manifest: unknown };

function readCache(now: number): VersionManifest | null {
  try {
    const entry = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as CacheEntry;
    if (typeof entry.fetchedAt !== 'number' || now - entry.fetchedAt >= CACHE_TTL_MS) return null;
    return VersionManifestSchema.parse(entry.manifest);
  } catch {
    return null; // miss / stale / corrupt
  }
}

async function fetchAndCache(now: number): Promise<VersionManifest | null> {
  try {
    const res = await fetch(versionCheckUrl(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const manifest = VersionManifestSchema.parse(await res.json());
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: now, manifest } satisfies CacheEntry));
    } catch {
      // best-effort cache; a write failure just means we re-fetch next time
    }
    return manifest;
  } catch {
    return null; // offline / timeout / malformed
  }
}

/**
 * Print a one-line out-of-date notice to stderr when the CLI is behind the
 * published manifest. Reads a fresh cache first; on a miss it fetches (bounded
 * timeout) and caches for next time. Never throws, never touches stdout, and does
 * nothing when suppressed. Call once from the CLI's pre-action hook.
 */
export async function maybeNotifyOutOfDate(now: number = Date.now()): Promise<void> {
  if (isSuppressed()) return;
  const manifest = readCache(now) ?? (await fetchAndCache(now));
  if (!manifest) return;
  const notice = buildNotice(getVersion(), manifest);
  if (!notice) return;
  process.stderr.write(`${renderNotice(notice)}\n`);
}
