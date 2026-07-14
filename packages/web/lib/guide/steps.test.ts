import { describe, expect, it } from 'vitest';

import { ALL_GUIDES, ASSISTANT_ANCHOR, GUIDE_ROUTE_MAP, KNOWN_GUIDE_IDS, guideLaunchPath, resolveGuide } from './steps';

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
    // Phase 67 D added dashboard/settings/etc.; these remain uncovered (logged
    // as a bounded follow-up in the phase doc).
    expect(resolveGuide('/ops')).toBeNull();
    expect(resolveGuide('/councils')).toBeNull();
    expect(resolveGuide('/media')).toBeNull();
  });

  it('covers every Phase 67 D surface + inherits on detail sub-routes', () => {
    expect(resolveGuide('/dashboard')?.id).toBe('dashboard');
    expect(resolveGuide('/office')?.id).toBe('office');
    expect(resolveGuide('/projects')?.id).toBe('projects');
    expect(resolveGuide('/projects/view')?.id).toBe('projects'); // detail inherits
    expect(resolveGuide('/digests')?.id).toBe('digests');
    expect(resolveGuide('/search')?.id).toBe('search');
    expect(resolveGuide('/settings')?.id).toBe('settings');
    expect(resolveGuide('/settings/team')?.id).toBe('settings'); // sub-route inherits
    expect(resolveGuide('/sessions/view')?.id).toBe('sessions'); // detail inherits
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

  it('registers every route-map guide in the ALL_GUIDES registry (Phase 67 A)', () => {
    const registered = new Set(ALL_GUIDES.map((g) => g.id));
    for (const { guide } of GUIDE_ROUTE_MAP) {
      expect(registered.has(guide.id)).toBe(true);
    }
  });

  it('guideLaunchPath returns each guide’s home route prefix (Phase 67 C)', () => {
    for (const guide of ALL_GUIDES) {
      const path = guideLaunchPath(guide);
      expect(path).not.toBeNull();
      // The launch path resolves back to the same guide.
      expect(resolveGuide(path!)?.id).toBe(guide.id);
    }
  });

  it('every guide carries a positive integer version (Phase 67 A)', () => {
    for (const guide of ALL_GUIDES) {
      expect(Number.isInteger(guide.version)).toBe(true);
      expect(guide.version).toBeGreaterThanOrEqual(1);
    }
  });

  // Version guard (Decision §5): this snapshots each guide's id → version. When a
  // guide's *content* is intentionally edited its version must be bumped so it
  // re-surfaces — editing steps without bumping the version leaves this snapshot
  // unchanged, which is the tell. Update the snapshot only alongside a conscious
  // version bump.
  it('matches the guide id → version snapshot (forces a conscious bump on edit)', () => {
    const versions = Object.fromEntries(ALL_GUIDES.map((g) => [g.id, g.version]));
    expect(versions).toEqual({
      board: 1,
      workflow: 1,
      sessions: 1,
      memory: 1,
      dashboard: 1,
      office: 1,
      projects: 1,
      digests: 1,
      search: 1,
      settings: 1,
    });
  });
});
