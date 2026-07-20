import { describe, expect, it } from 'vitest';
import { ADMIN_NAV } from './nav-config';

// The operator console's rail is a FIXED set of seven surfaces (no FEATURES, no
// user toggle — unlike web). This pins the list + its order so a stray add/remove
// or a re-order is caught. The render-side (rail → <AppFrame>) is covered by
// `components/app-shell-client.test.tsx`.
describe('ADMIN_NAV', () => {
  it('is the seven operator surfaces, in rail order', () => {
    expect(ADMIN_NAV.map((e) => e.id)).toEqual([
      'overview',
      'usage',
      'users',
      'projects',
      'versions',
      'audit',
      'links',
    ]);
  });

  it('gives each route a label and an href', () => {
    for (const entry of ADMIN_NAV) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.href.startsWith('/')).toBe(true);
    }
    // Overview is the root; every other route is a distinct sub-path.
    expect(ADMIN_NAV.find((e) => e.id === 'overview')?.href).toBe('/');
    const hrefs = ADMIN_NAV.map((e) => e.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
