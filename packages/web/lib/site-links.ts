// --- GitHub / release links (Phase 71 Theme F) -----------------------------
//
// The public repo slug drives the raw-content + releases URLs the update banner
// uses to surface release notes. The repo is public, so `raw.githubusercontent`
// serves the CHANGELOG with an open CORS header — a plain client fetch works.

/** Source repo slug — the private monorepo, used for raw-content fetches (CHANGELOG). */
export const GITHUB_REPO = 'bilo-io/midnite';

/**
 * Public-facing companion repo. The source repo (`GITHUB_REPO`) is private, so every
 * user-clickable GitHub link — releases, release tags, the issue tracker — resolves
 * here, where `release.yml` publishes the installers + notes (see docs/RELEASING.md).
 * Mirrors the same split in `packages/site/lib/site.ts`.
 */
export const PUBLIC_GITHUB_REPO = 'bilo-io/midnite-app';

// Where the docs site (packages/docs) lives, resolved per environment.
//
// In dev the docs SPA runs on its fixed, strict port — see docs/vite.config.ts
// (`server.port: 5173`, `strictPort: true`) and docs/moon.yml — so we point
// straight at it. In a deployed build the URL comes from `NEXT_PUBLIC_DOCS_URL`
// when set, else the GitHub Pages deploy the docs CI publishes (preview.yml →
// `destination_dir: docs` on `<owner>.github.io/<repo>`). Falling back to the
// real hosted URL — not '#' — keeps the assistant's Docs link off the webapp
// origin (a bare '#' resolves to the current page, i.e. the app itself).
const [GITHUB_OWNER, GITHUB_REPO_NAME] = GITHUB_REPO.split('/');
export const DOCS_PAGES_URL = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO_NAME}/docs`;

export const DOCS_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : (process.env.NEXT_PUBLIC_DOCS_URL ?? DOCS_PAGES_URL);

/**
 * Raw CHANGELOG, fetched from the PUBLIC mirror repo's default branch. `main`'s
 * changelog already contains every released version's section, so one fetch covers
 * any version the banner shows — no per-tag fetch needed. We read from the public
 * companion (not the private source) so the fetch keeps resolving anonymously once
 * `GITHUB_REPO` goes private: the `sync-public-assets` workflow mirrors `CHANGELOG.md`
 * there on every `main` push. Callers stay fail-soft regardless.
 */
export const GITHUB_RAW_CHANGELOG_URL = `https://raw.githubusercontent.com/${PUBLIC_GITHUB_REPO}/main/CHANGELOG.md`;

/**
 * Public GitHub Releases page — the fail-soft fallback when notes can't be fetched.
 * Points at the public companion repo (`PUBLIC_GITHUB_REPO`), since the source repo's
 * own releases aren't anonymously reachable.
 */
export const GITHUB_RELEASES_URL = `https://github.com/${PUBLIC_GITHUB_REPO}/releases`;

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
