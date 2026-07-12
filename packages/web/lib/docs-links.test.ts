import { describe, expect, it } from 'vitest';

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

  it('builds a hash-routed deep link, and the docs home for unmapped routes', () => {
    expect(docsUrlForPathname('/tasks/graph')).toMatch(/\/#\/app\/tasks$/);
    expect(docsUrlForPathname('/search')).toMatch(/\/$/);
    expect(docsUrlForPathname('/search')).not.toContain('#');
  });
});
