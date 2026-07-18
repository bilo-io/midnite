// Pure gate for the "vX available" echo toast (Phase 71 Theme F). Kept in its own
// module — free of the `@midnite/shared` / version-poll import chain — so the
// once-per-version logic unit-tests without resolving the whole provider graph.

/** localStorage key holding the last version we echoed, so the toast fires once per version. */
export const UPDATE_ECHO_KEY = 'midnite:update-echoed';

/**
 * Whether to raise the "vX available" echo toast: an update is available for a
 * known version we haven't already echoed. A dismissed banner re-surfaces on
 * navigation, but the toast must not nag — the `lastEchoed` guard covers that.
 */
export function shouldEchoUpdate(
  available: boolean,
  latest: string | null,
  lastEchoed: string | null,
): boolean {
  return available && latest !== null && latest !== lastEchoed;
}
