import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DOCS_ROUTE_MAP,
  KNOWN_DOCS_SLUGS,
  docsUrlForPathname,
  resolveDocsSlug,
} from './docs-links';

describe('docs-links', () => {
  it('only ever targets a real docs slug (guards against map drift)', () => {
    for (const { slug } of DOCS_ROUTE_MAP) {
      expect(KNOWN_DOCS_SLUGS).toContain(slug);
    }
  });

  it('every known docs slug is a well-formed section path', () => {
    for (const slug of KNOWN_DOCS_SLUGS) {
      expect(slug).toMatch(/^\/[a-z]+\/[a-z-]+$/);
    }
  });

  it('resolves a route to its section doc', () => {
    expect(resolveDocsSlug('/tasks')).toBe('/app/tasks');
    expect(resolveDocsSlug('/memory')).toBe('/agents/memory');
    expect(resolveDocsSlug('/ops')).toBe('/overview/ops');
  });

  it('resolves nested sub-routes to the parent section doc', () => {
    expect(resolveDocsSlug('/tasks/graph')).toBe('/app/tasks');
    expect(resolveDocsSlug('/memory/view')).toBe('/agents/memory');
    expect(resolveDocsSlug('/settings/team/detail')).toBe('/settings/settings');
  });

  it('falls back to null for unmapped routes', () => {
    expect(resolveDocsSlug('/search')).toBeNull();
    expect(resolveDocsSlug('/')).toBeNull();
  });

  describe('docsUrlForPathname', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('builds a hash-routed deep link, and the docs home for unmapped routes', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_DOCS_URL', 'https://example.test/docs');
      expect(docsUrlForPathname('/tasks/graph')).toBe('https://example.test/docs/#/app/tasks');
      expect(docsUrlForPathname('/search')).toBe('https://example.test/docs/');
      expect(docsUrlForPathname('/search')).not.toContain('#');
    });

    it('uses the fixed docs dev server in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(docsUrlForPathname('/memory/view')).toBe('http://localhost:5173/#/agents/memory');
    });

    it('falls back to the hosted Vercel docs when no env override is set', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_DOCS_URL', undefined);
      // Never the app's own origin (a bare '#') — the real docs deploy.
      expect(docsUrlForPathname('/tasks')).toBe(
        'https://midnite-docs-vision-studios-projects.vercel.app/#/app/tasks',
      );
    });

    it("degrades to '#' only when explicitly configured with an empty URL", () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('NEXT_PUBLIC_DOCS_URL', '');
      expect(docsUrlForPathname('/tasks')).toBe('#');
    });
  });
});
