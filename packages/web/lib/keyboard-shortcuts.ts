/** A keyboard shortcut shown in the `?` help overlay. */
export type Shortcut = {
  /** Display representation of the key(s) — e.g. `['⌘', 'K']` or `['G', 'B']`. */
  keys: string[];
  /** Key into the `search` namespace's `shortcuts.items.*` (Phase 82 Theme D). */
  labelKey: string;
  group: 'general' | 'navigation' | 'board';
};

export const SHORTCUTS: Shortcut[] = [
  // General
  { keys: ['⌘K'], labelKey: 'openPalette', group: 'general' },
  { keys: ['?'], labelKey: 'shortcutsHelp', group: 'general' },
  { keys: ['N'], labelKey: 'newTask', group: 'general' },
  { keys: ['Esc'], labelKey: 'closeModal', group: 'general' },
  // Navigation
  { keys: ['G', 'H'], labelKey: 'goHome', group: 'navigation' },
  { keys: ['G', 'B'], labelKey: 'goBoard', group: 'navigation' },
  { keys: ['G', 'O'], labelKey: 'goOffice', group: 'navigation' },
  { keys: ['G', 'S'], labelKey: 'goSettings', group: 'navigation' },
  // Board
  { keys: ['↑', '↓'], labelKey: 'moveFocusCards', group: 'board' },
  { keys: ['←', '→'], labelKey: 'moveFocusColumns', group: 'board' },
  { keys: ['Enter'], labelKey: 'openCard', group: 'board' },
  { keys: ['D'], labelKey: 'markDone', group: 'board' },
  { keys: ['A'], labelKey: 'abandonCard', group: 'board' },
];
