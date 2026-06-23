import { describe, expect, it } from 'vitest';
import { DESK_ITEM_CATALOG, DEFAULT_DESK_ITEMS, deskItemById, parseDeskItems } from './desk-items';

describe('DESK_ITEM_CATALOG', () => {
  it('has at least 4 entries with unique ids', () => {
    expect(DESK_ITEM_CATALOG.length).toBeGreaterThanOrEqual(4);
    const ids = DESK_ITEM_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a non-empty label and emoji', () => {
    for (const item of DESK_ITEM_CATALOG) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe('deskItemById', () => {
  it('returns the item for a known id', () => {
    const item = deskItemById('lava-lamp');
    expect(item?.label).toBe('Lava Lamp');
  });

  it('returns undefined for an unknown id', () => {
    expect(deskItemById('nonexistent')).toBeUndefined();
  });
});

describe('parseDeskItems', () => {
  it('returns DEFAULT_DESK_ITEMS for null', () => {
    expect(parseDeskItems(null)).toEqual(DEFAULT_DESK_ITEMS);
  });

  it('returns DEFAULT_DESK_ITEMS for invalid JSON', () => {
    expect(parseDeskItems('{bad')).toEqual(DEFAULT_DESK_ITEMS);
  });

  it('filters out unknown ids', () => {
    const result = parseDeskItems(JSON.stringify(['lava-lamp', 'unknown', 'mug']));
    expect(result).toEqual(['lava-lamp', 'mug']);
  });

  it('returns DEFAULT_DESK_ITEMS when all ids are unknown', () => {
    expect(parseDeskItems(JSON.stringify(['ghost', 'phantom']))).toEqual(DEFAULT_DESK_ITEMS);
  });
});
