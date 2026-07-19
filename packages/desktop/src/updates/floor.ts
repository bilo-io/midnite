// Force-update floor + channel helpers for the desktop updater (Phase 71 Theme H).
//
// electron-updater's feed doesn't carry the manifest's `minSupported`, so the main
// process fetches the channel's `version.json` itself to learn the floor. Kept
// electron-free + pure (no `electron` import) so it unit-tests in plain node — and
// deliberately self-contained rather than importing `@midnite/shared` at runtime,
// mirroring how the desktop redeclares its `UpdateState` contract (the shared value
// exports aren't bundled into the packaged main process).

export type UpdateChannel = 'stable' | 'beta';

/** The published manifest filename for a channel — mirrors `shared`'s `versionManifestFile`. */
export function manifestFileForChannel(channel: UpdateChannel): string {
  return channel === 'beta' ? 'version.beta.json' : 'version.json';
}

/**
 * Where the committed manifest lives for GitHub-raw fetching (the same source the
 * CLI uses). Theme G commits `version.json` under `packages/web/public/`. Fetched
 * from the PUBLIC mirror repo (not the private source) so it keeps resolving
 * anonymously once the source repo is private — the `sync-public-assets` workflow
 * mirrors it there on every `main` push. Overridable via `MIDNITE_VERSION_URL_BASE`
 * for testing / self-hosting.
 */
export const MANIFEST_RAW_BASE =
  process.env.MIDNITE_VERSION_URL_BASE ??
  'https://raw.githubusercontent.com/bilo-io/midnite-app/main/packages/web/public';

export function manifestUrlForChannel(channel: UpdateChannel): string {
  return `${MANIFEST_RAW_BASE}/${manifestFileForChannel(channel)}`;
}

/** Parse a `MAJOR.MINOR.PATCH` string into a numeric triple, or null if malformed. */
function parseSemVer(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** True when `current < minSupported`. Undefined/malformed floor → never below (fail-open). */
export function isBelowFloor(current: string, minSupported?: string | null): boolean {
  if (!minSupported) return false;
  const a = parseSemVer(current);
  const b = parseSemVer(minSupported);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i]! < b[i]!) return true;
    if (a[i]! > b[i]!) return false;
  }
  return false;
}

/**
 * Fetch the channel manifest and report whether `currentVersion` is below its
 * `minSupported` floor. Never throws — an unreachable/malformed manifest resolves
 * to `false` (fail-open: a network hiccup must not lock the user out).
 */
export async function fetchBelowFloor(
  currentVersion: string,
  channel: UpdateChannel,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(manifestUrlForChannel(channel), { cache: 'no-store' });
    if (!res.ok) return false;
    const body = (await res.json()) as { minSupported?: string | null };
    return isBelowFloor(currentVersion, body.minSupported ?? null);
  } catch {
    return false;
  }
}
