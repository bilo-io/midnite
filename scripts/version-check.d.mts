// Type declarations for the version-check guard (a plain .mjs so it runs
// import-free in `moon ci` before any build). Lets the shared test import the pure
// `checkManifestFreshness` helper with types instead of tripping noImplicitAny.

export function checkManifestFreshness(
  manifest: unknown,
  webVersion: string | undefined,
): { ok: boolean; message: string };
