export type DeskItem = {
  id: string;
  label: string;
  emoji: string;
};

/** Items available in the corner-office desk picker (Phase 9 F2). */
export const DESK_ITEM_CATALOG: DeskItem[] = [
  { id: 'lava-lamp', label: 'Lava Lamp', emoji: '🫧' },
  { id: 'fidget-spinner', label: 'Fidget Spinner', emoji: '🌀' },
  { id: 'succulent', label: 'Succulent', emoji: '🌵' },
  { id: 'mug', label: 'Coffee Mug', emoji: '☕' },
  { id: 'rubiks-cube', label: "Rubik's Cube", emoji: '🎲' },
  { id: 'photo-frame', label: 'Photo Frame', emoji: '🖼️' },
];

/** Default items placed on the desk when first visiting. */
export const DEFAULT_DESK_ITEMS: string[] = ['lava-lamp', 'mug'];

export function deskItemById(id: string): DeskItem | undefined {
  return DESK_ITEM_CATALOG.find((item) => item.id === id);
}

/** Deserialise a localStorage string into a valid item-id list (unknown ids dropped). */
export function parseDeskItems(raw: string | null): string[] {
  if (!raw) return DEFAULT_DESK_ITEMS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_DESK_ITEMS;
    const validIds = new Set(DESK_ITEM_CATALOG.map((i) => i.id));
    const items = parsed.filter((x): x is string => typeof x === 'string' && validIds.has(x));
    return items.length ? items : DEFAULT_DESK_ITEMS;
  } catch {
    return DEFAULT_DESK_ITEMS;
  }
}
