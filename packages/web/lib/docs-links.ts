/**
 * Docs deep-linking (Phase 66 Theme C). Resolves the current App-Router pathname
 * to the matching `@midnite/docs` page so the assistant's "Docs" entry opens the
 * docs *for where you are*, not a generic home.
 *
 * Two facts about the docs site shape the URLs here:
 * - It's a **hash-routed** static SPA (packages/docs README), so a deep link is
 *   `${base}/#${slug}`, not `${base}${slug}`.
 * - Hosting is a deferred follow-on, so the base URL is deploy-configured via
 *   `NEXT_PUBLIC_DOCS_URL` with a sensible fallback.
 *
 * Boundary note: `web` must not import `@midnite/docs` (a separate leaf consumer
 * of `@midnite/ui`; there is no web→docs edge). So the valid docs slugs are
 * mirrored in {@link KNOWN_DOCS_SLUGS} — the docs-links test asserts every mapped
 * slug is one of them, catching map typos. The docs site owns its own
 * nav-integrity test (packages/docs/src/content/nav.test.ts). Keep both lists in
 * sync when pages are added/renamed under packages/docs/src/content/.
 */

import { DOCS_PAGES_URL } from '@midnite/shared';

/**
 * The docs site's base URL (trailing slash trimmed), resolved per environment.
 * In dev the docs SPA runs on its fixed strict port (docs/vite.config.ts →
 * `server.port: 5173`); a deployed build reads `NEXT_PUBLIC_DOCS_URL`, else falls
 * back to the GitHub Pages deploy the docs CI publishes ({@link DOCS_PAGES_URL}).
 * The fallback is the real hosted URL — never '' — so the Docs link can't degrade
 * to '#' and reopen the app's own origin instead of the docs site.
 * Read at call time (not a module-load constant) so it stays correct + testable.
 */
export function docsBaseUrl(): string {
  const origin =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:5173'
      : (process.env['NEXT_PUBLIC_DOCS_URL'] ?? DOCS_PAGES_URL);
  return origin.replace(/\/+$/, '');
}

/**
 * Every product-doc slug the docs site currently serves (mirror of the MDX
 * files under packages/docs/src/content/ + the product guides). The test guards
 * that {@link DOCS_ROUTE_MAP} only ever targets one of these.
 */
export const KNOWN_DOCS_SLUGS = [
  '/overview/dashboard',
  '/overview/digests',
  '/overview/ops',
  '/overview/office',
  '/app/tasks',
  '/app/projects',
  '/app/workflows',
  '/app/slides',
  '/agents/councils',
  '/agents/sessions',
  '/agents/media',
  '/agents/memory',
  '/settings/settings',
  '/guides/memory-workspace',
] as const;

export type DocsSlug = (typeof KNOWN_DOCS_SLUGS)[number];

/**
 * App-Router pathname prefix → docs slug. Matched longest-prefix-first, so
 * sub-routes inherit their section's doc (`/tasks/graph` → `/app/tasks`,
 * `/settings/team` → `/settings/settings`, `/memory/view` → `/agents/memory`).
 * Routes with no doc page (e.g. `/search`) fall through to the docs home.
 */
export const DOCS_ROUTE_MAP: ReadonlyArray<{ prefix: string; slug: DocsSlug }> = [
  { prefix: '/dashboard', slug: '/overview/dashboard' },
  { prefix: '/digests', slug: '/overview/digests' },
  { prefix: '/ops', slug: '/overview/ops' },
  { prefix: '/office', slug: '/overview/office' },
  { prefix: '/tasks', slug: '/app/tasks' },
  { prefix: '/projects', slug: '/app/projects' },
  { prefix: '/workflows', slug: '/app/workflows' },
  { prefix: '/slides', slug: '/app/slides' },
  { prefix: '/councils', slug: '/agents/councils' },
  { prefix: '/sessions', slug: '/agents/sessions' },
  { prefix: '/media', slug: '/agents/media' },
  { prefix: '/memory', slug: '/agents/memory' },
  { prefix: '/settings', slug: '/settings/settings' },
];

/** Resolve a pathname to its docs slug, or `null` when no page maps (→ home). */
export function resolveDocsSlug(pathname: string): DocsSlug | null {
  const match = DOCS_ROUTE_MAP
    // Longest prefix wins so a nested route can't be shadowed by a shorter one.
    .filter(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match?.slug ?? null;
}

/**
 * The full docs URL for a pathname — the mapped page (hash-routed) or the docs
 * home. Degrades to '#' when docs aren't hosted (no dev, no `NEXT_PUBLIC_DOCS_URL`).
 */
export function docsUrlForPathname(pathname: string): string {
  const base = docsBaseUrl();
  if (!base) return '#';
  const slug = resolveDocsSlug(pathname);
  return slug ? `${base}/#${slug}` : `${base}/`;
}
