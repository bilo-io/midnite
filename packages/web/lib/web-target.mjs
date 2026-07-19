// Phase 72 D — pick Next's `output` from the build target. Plain JS (not TS) so
// next.config.mjs can import it directly under Node at config-load time; a sibling
// web-target.d.mts types it for the vitest unit + tsc. See docs/SSO.md (hosted).
//
//  - default (unset, or MIDNITE_WEB_TARGET=static) → 'export': the static bundle
//    the desktop app + GitHub Pages consume (out/), byte-for-byte unchanged.
//  - MIDNITE_WEB_TARGET=server → undefined: drops the export so the /api/auth/*
//    BFF route handlers (login/refresh/logout + sso/callback) build and run in a
//    hosted Next server, which the SSO cookie flow needs.

/** @param {Record<string, string | undefined>} env */
export function resolveWebTarget(env) {
  return (env.MIDNITE_WEB_TARGET ?? 'static').toLowerCase() === 'server' ? 'server' : 'static';
}

/** @param {Record<string, string | undefined>} env */
export function resolveWebOutput(env) {
  return resolveWebTarget(env) === 'server' ? undefined : 'export';
}
