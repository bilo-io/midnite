import { describe, expect, it } from 'vitest';

import { PANEL_SECTIONS, PANEL_SECTION_IDS, getPanelSection } from './panel-sections';

const CONTENT_KEYS = ['terminal', 'kanban', 'session'];

describe('panel sections', () => {
  it('has unique ids and known content keys', () => {
    const ids = PANEL_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of PANEL_SECTIONS) {
      expect(CONTENT_KEYS).toContain(section.content);
    }
  });

  it('exposes PANEL_SECTION_IDS in document order', () => {
    expect(PANEL_SECTION_IDS).toEqual(PANEL_SECTIONS.map((s) => s.id));
  });

  it('getPanelSection resolves a known id and handles misses / null', () => {
    expect(getPanelSection('top')?.placement).toBe('hero');
    expect(getPanelSection('does-not-exist')).toBeUndefined();
    expect(getPanelSection(null)).toBeUndefined();
    expect(getPanelSection(undefined)).toBeUndefined();
  });
});
