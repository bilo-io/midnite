import {
  VersionManifestSchema,
  versionManifestFile,
  type UpdateChannel,
  type VersionManifest,
} from '@midnite/shared';

/**
 * The version.json the running build polls for a newer release. Served static
 * from the web origin (Phase 71 Theme G emits it on every tag). Cache-busted so
 * a CDN can't pin a stale manifest. This is the `stable` path; `beta` clients
 * poll `version.beta.json` — see {@link versionManifestPath}.
 */
export const VERSION_MANIFEST_PATH = '/version.json';

/**
 * Same-origin manifest path for a channel (Phase 71 Theme H): `stable` →
 * `/version.json`, `beta` → `/version.beta.json`. The filename mapping lives in
 * `shared` so web, desktop, and the CLI resolve the same per-channel file.
 */
export function versionManifestPath(channel: UpdateChannel): string {
  return `/${versionManifestFile(channel)}`;
}

/**
 * This build's version, inlined at build time by next.config from the web
 * package.json (`NEXT_PUBLIC_APP_VERSION`). Falls back to `0.0.0` in dev / when
 * unset — which compares as "always behind", so the banner never hides a real
 * update behind a missing constant.
 */
export function getCurrentVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
}

/**
 * Fetch + validate the published version manifest. Always hits the network
 * fresh (`no-store` + a cache-busting query) so neither the browser nor a CDN
 * can serve a stale "latest". Throws on a network error or a malformed manifest;
 * callers (the detection hook) fail soft.
 */
export async function fetchVersionManifest(
  path: string = VERSION_MANIFEST_PATH,
  signal?: AbortSignal,
): Promise<VersionManifest> {
  const bust = `_=${encodeURIComponent(String(Date.now()))}`;
  const url = path.includes('?') ? `${path}&${bust}` : `${path}?${bust}`;
  const res = await fetch(url, { cache: 'no-store', signal });
  if (!res.ok) {
    throw new Error(`version manifest fetch failed: ${res.status}`);
  }
  return VersionManifestSchema.parse(await res.json());
}
