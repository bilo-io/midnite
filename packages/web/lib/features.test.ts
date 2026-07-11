import { describe, expect, it } from 'vitest';

import { FEATURES, NAV_CATEGORIES, groupNavSections, type FeatureKey } from './features';

const keysOf = (fs: { key: FeatureKey }[]) => fs.map((f) => f.key);

describe('groupNavSections', () => {
  it('pins dashboard and splits the rest into ordered App / Agents / Insights sections', () => {
    const { pinned, sections } = groupNavSections(FEATURES);

    expect(keysOf(pinned)).toEqual(['dashboard']);
    expect(sections.map((s) => s.key)).toEqual(['app', 'agents', 'insights']);
    expect(sections.map((s) => s.label)).toEqual(['App', 'Agents', 'Insights']);

    const byKey = Object.fromEntries(sections.map((s) => [s.key, keysOf(s.features)]));
    expect(byKey['app']).toEqual(['projects', 'tasks', 'memory', 'slides', 'workflows', 'schedules']);
    expect(byKey['agents']).toEqual(['sessions', 'office', 'councils', 'ideas', 'media']);
    expect(byKey['insights']).toEqual(['digests', 'ops']);
  });

  it('drops sections whose features are all filtered out', () => {
    // Simulate an enabled set with no Insights surfaces left.
    const enabled = FEATURES.filter((f) => f.category !== 'insights');
    const { sections } = groupNavSections(enabled);
    expect(sections.map((s) => s.key)).toEqual(['app', 'agents']);
  });

  it('yields no pinned entry when dashboard is disabled', () => {
    const enabled = FEATURES.filter((f) => f.key !== 'dashboard');
    const { pinned, sections } = groupNavSections(enabled);
    expect(pinned).toEqual([]);
    expect(sections).toHaveLength(3);
  });

  it('every categorised feature maps to a known category', () => {
    const known = new Set(NAV_CATEGORIES.map((c) => c.key));
    for (const f of FEATURES) {
      if (f.category) expect(known.has(f.category)).toBe(true);
    }
  });
});
