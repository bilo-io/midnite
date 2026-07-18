import { z } from 'zod';
import { compareSemVer } from './version.js';

// The runtime "what's the latest build?" contract. The release flow (Phase 71
// Theme G) emits a `version.json` conforming to this on every tag; a running
// client fetches + parses it and compares against its own bundled version. Kept
// here in `shared` so web, desktop, and the CLI all agree on exactly one shape —
// no ad-hoc `fetch().json()` consumers. See todo/phase-71-app-update-banner.md.

/** Release channels a client can subscribe to. `stable` is the default. */
export const UPDATE_CHANNELS = ['stable', 'beta'] as const;
export const UpdateChannelSchema = z.enum(UPDATE_CHANNELS);
export type UpdateChannel = z.infer<typeof UpdateChannelSchema>;

/** `MAJOR.MINOR.PATCH` — the same plain-triple semver the lockstep math uses. */
const SemVerStringSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'expected MAJOR.MINOR.PATCH');

/**
 * The published version manifest. `version` is the latest available build;
 * `minSupported` (optional) is the force-update floor a client below which must
 * update to proceed (Phase 71 Theme H); `notesUrl` optionally points at release
 * notes for the version.
 */
export const VersionManifestSchema = z.object({
  version: SemVerStringSchema,
  channel: UpdateChannelSchema.default('stable'),
  minSupported: SemVerStringSchema.optional(),
  releasedAt: z.string().datetime().optional(),
  notesUrl: z.string().url().optional(),
});
export type VersionManifest = z.infer<typeof VersionManifestSchema>;

/**
 * True when `latest` is strictly newer than `current` (a real update is
 * available). Equal or ahead → false. Throws on a malformed version so a bad
 * manifest surfaces loudly rather than silently nagging.
 */
export function isUpdateAvailable(current: string, latest: string): boolean {
  return compareSemVer(current, latest) < 0;
}

/**
 * True when `current` is below the force-update floor `minSupported` (the client
 * is too far behind to keep running as-is). Undefined floor → never below.
 */
export function isBelowFloor(current: string, minSupported?: string): boolean {
  if (!minSupported) return false;
  return compareSemVer(current, minSupported) < 0;
}
