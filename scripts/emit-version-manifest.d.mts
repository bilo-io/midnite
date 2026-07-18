// Type declarations for the release-flow manifest emitter (a plain .mjs so it runs
// import-free in `moon ci`/at release). Lets TS consumers — the shared test that
// pins the output against VersionManifestSchema — import `buildManifest` with types
// instead of tripping noImplicitAny (TS7016).

export interface EmittedVersionManifest {
  version: string;
  channel: string;
  releasedAt: string;
  notesUrl: string;
}

export function buildManifest(input: {
  version: string;
  channel?: string;
  releasedAt?: string;
  notesUrl?: string;
}): EmittedVersionManifest;
