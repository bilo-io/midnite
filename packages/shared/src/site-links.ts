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
// when set, else the hosted Vercel deploy (its own Vercel project — see
// docs/CICD.md). Falling back to the real hosted URL — not '#' — keeps the
// assistant's Docs link off the webapp origin (a bare '#' resolves to the
// current page, i.e. the app itself).
export const DOCS_HOSTED_URL = 'https://midnite-docs-vision-studios-projects.vercel.app';

export const DOCS_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : (process.env.NEXT_PUBLIC_DOCS_URL ?? DOCS_HOSTED_URL);

/**
 * The deployed web-app URL. Promoted here (Phase 73 Theme G) from
 * `packages/site/lib/site.ts` so every package agrees on one canonical value —
 * the marketing site's "Open the app" CTA and the operator console's "Web app"
 * quick link both resolve here. Overridable per environment via
 * `NEXT_PUBLIC_APP_URL`; falls back to the hosted deployment.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://midnite-web-vision-studios-projects.vercel.app';

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

// --- Report issue (Phase 74) -----------------------------------------------
//
// The assistant menu's "Report issue" entry hands off to a *prefilled* GitHub
// issue in the PUBLIC companion repo — pure client-side compose, no gateway, no
// token. The label + template files live in `midnite-app` (see docs/Guides);
// GitHub silently ignores labels/templates that don't exist yet, so the link is
// safe to ship before they're committed there.

/** Labels stamped on app-generated reports. `from-app` distinguishes them from
 * issues opened directly on GitHub (a useful triage signal). */
export const REPORT_ISSUE_LABELS = ['bug', 'from-app'] as const;

/** The issue-form template the hand-off requests (authored for `midnite-app`,
 * Phase 74 Theme E). Our explicit `?body=` wins over the template body, but its
 * front-matter (labels/assignees) still applies. */
export const REPORT_ISSUE_TEMPLATE = 'bug_report.md';

/**
 * GitHub truncates very long `issues/new` URLs (~8KB in practice). The dialog
 * (Phase 74 Theme B) warns + auto-trims the context block when the assembled URL
 * exceeds this budget, and offers a Copy-body fallback for the freeform tail.
 */
export const MAX_ISSUE_URL_LENGTH = 8000;

/**
 * Build a prefilled `github.com/<repo>/issues/new` URL for the PUBLIC companion
 * repo. Pure + unit-testable: every field is `encodeURIComponent`-escaped so
 * spaces, newlines, `#`, and unicode survive the hand-off. `labels`/`template`
 * default to the report constants; pass `template: null` to omit it.
 */
export function githubIssuesNewUrl({
  title,
  body,
  labels = REPORT_ISSUE_LABELS,
  template = REPORT_ISSUE_TEMPLATE,
}: {
  title: string;
  body: string;
  labels?: readonly string[];
  template?: string | null;
}): string {
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (body) params.set('body', body);
  if (labels.length > 0) params.set('labels', labels.join(','));
  if (template) params.set('template', template);
  // URLSearchParams encodes spaces as `+`; GitHub accepts both, but `%20` is the
  // safer, more universally-understood form for an issue body — normalise it.
  const query = params.toString().replace(/\+/g, '%20');
  return `https://github.com/${PUBLIC_GITHUB_REPO}/issues/new?${query}`;
}
