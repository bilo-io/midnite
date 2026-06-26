/** A keyboard shortcut shown in the `?` help overlay. */
export type Shortcut = {
  /** Display representation of the key(s) — e.g. `['⌘', 'K']` or `['G', 'B']`. */
  keys: string[];
  label: string;
  group: 'General' | 'Navigation' | 'Board';
};

export const SHORTCUTS: Shortcut[] = [
  // General
  { keys: ['⌘K'], label: 'Open command palette', group: 'General' },
  { keys: ['?'], label: 'Keyboard shortcuts', group: 'General' },
  { keys: ['N'], label: 'New task (when not in an input)', group: 'General' },
  { keys: ['Esc'], label: 'Close modal / drawer', group: 'General' },
  // Navigation
  { keys: ['G', 'H'], label: 'Go to Home', group: 'Navigation' },
  { keys: ['G', 'B'], label: 'Go to Board', group: 'Navigation' },
  { keys: ['G', 'O'], label: 'Go to Office', group: 'Navigation' },
  { keys: ['G', 'S'], label: 'Go to Settings', group: 'Navigation' },
  // Board
  { keys: ['↑', '↓'], label: 'Move focus between cards', group: 'Board' },
  { keys: ['←', '→'], label: 'Move focus between columns', group: 'Board' },
  { keys: ['Enter'], label: 'Open focused card', group: 'Board' },
  { keys: ['D'], label: 'Mark focused card done', group: 'Board' },
  { keys: ['A'], label: 'Abandon focused card', group: 'Board' },
];
