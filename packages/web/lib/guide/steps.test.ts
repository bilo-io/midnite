import { describe, expect, it } from 'vitest';

import { ASSISTANT_ANCHOR, GUIDE_ROUTE_MAP, KNOWN_GUIDE_IDS, resolveGuide } from './steps';

describe('guide step registry', () => {
  it('resolves a route to its guide', () => {
    expect(resolveGuide('/tasks')?.id).toBe('board');
    expect(resolveGuide('/sessions')?.id).toBe('sessions');
    expect(resolveGuide('/memory')?.id).toBe('memory');
  });

  it('matches the workflow builder route and its sub-paths', () => {
    expect(resolveGuide('/workflows/edit')?.id).toBe('workflow');
    expect(resolveGuide('/workflows/edit/node')?.id).toBe('workflow');
  });

  it('inherits the section guide for sub-routes', () => {
    expect(resolveGuide('/tasks/graph')?.id).toBe('board');
    expect(resolveGuide('/memory/view')?.id).toBe('memory');
  });

  it('returns null for a route with no guide', () => {
    expect(resolveGuide('/dashboard')).toBeNull();
    expect(resolveGuide('/settings/team')).toBeNull();
  });

  it('only targets known guide ids', () => {
    for (const { guide } of GUIDE_ROUTE_MAP) {
      expect(KNOWN_GUIDE_IDS).toContain(guide.id);
    }
  });

  it('every guide has ≥1 step and ends on the always-present assistant anchor', () => {
    for (const { guide } of GUIDE_ROUTE_MAP) {
      expect(guide.steps.length).toBeGreaterThan(0);
      expect(guide.steps.at(-1)?.anchor).toBe(ASSISTANT_ANCHOR);
    }
  });

  it('no prefix is a substring-shadow of another (avoids accidental double-match order bugs)', () => {
    const prefixes = GUIDE_ROUTE_MAP.map((e) => e.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});
