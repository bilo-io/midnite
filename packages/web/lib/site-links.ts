// Where the docs site (packages/docs) lives, resolved per environment.
//
// In dev the docs SPA runs on its fixed, strict port — see docs/vite.config.ts
// (`server.port: 5173`, `strictPort: true`) and docs/moon.yml — so we point
// straight at it. In a deployed build the URL comes from `NEXT_PUBLIC_DOCS_URL`,
// falling back to '#' so the link degrades gracefully when docs aren't hosted.
//
// `process.env.NODE_ENV` and `NEXT_PUBLIC_*` are inlined by Next at build time,
// so this stays correct in server and client components alike.
export const DOCS_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : (process.env.NEXT_PUBLIC_DOCS_URL ?? '#');

// --- GitHub / release links (Phase 71 Theme F) -----------------------------
//
// The public repo slug drives the raw-content + releases URLs the update banner
// uses to surface release notes. The repo is public, so `raw.githubusercontent`
// serves the CHANGELOG with an open CORS header — a plain client fetch works.

/** Public repo slug — the single source for raw-content + release URLs. */
export const GITHUB_REPO = 'bilo-io/midnite';

/**
 * Raw CHANGELOG on the default branch. `main`'s changelog already contains every
 * released version's section, so one fetch covers any version the banner shows —
 * no per-tag fetch needed. Fail-soft: callers fall back to the docs/release link.
 */
export const GITHUB_RAW_CHANGELOG_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/CHANGELOG.md`;

/** GitHub Releases page — the fail-soft fallback when notes can't be fetched. */
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

/**
 * Deep-link to a version's section on the docs changelog page. Docs uses a
 * HashRouter, so the route lives after the `#` and the version rides as a query
 * param the page reads to scroll to that section (a second `#anchor` can't work
 * under hash routing). Degrades gracefully when `DOCS_URL` is unset (`#`).
 */
export function docsChangelogUrl(version?: string | null): string {
  const base = `${DOCS_URL}/#/changelog`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}
