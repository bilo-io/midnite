import { describe, expect, it } from 'vitest';

import { SECTIONS, SECTION_IDS, getSection } from './registry';

describe('section registry', () => {
  it('has at least one section with unique, non-empty ids and titles', () => {
    expect(SECTIONS.length).toBeGreaterThan(0);
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of SECTIONS) {
      expect(section.id.length).toBeGreaterThan(0);
      expect(section.title.length).toBeGreaterThan(0);
    }
  });

  it('exposes SECTION_IDS in the same order as SECTIONS', () => {
    expect(SECTION_IDS).toEqual(SECTIONS.map((s) => s.id));
  });

  it('getSection resolves a known id and returns undefined otherwise', () => {
    expect(getSection('how')?.id).toBe('how');
    expect(getSection('does-not-exist')).toBeUndefined();
  });
});
