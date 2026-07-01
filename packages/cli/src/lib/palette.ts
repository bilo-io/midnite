import chalk from 'chalk';

import { isInteractive } from './brand.js';

// ── Colour vocabulary ────────────────────────────────────────────────────────
// Terminal colours chosen to echo the web's `@midnite/ui` status/kind hues
// (`tokens.css`): wip→orange, done→green, bug→red, … The CLI can't import the
// design-system package (boundary rule), so the hexes are mirrored here. chalk
// downgrades 24-bit hex to the nearest ANSI colour on terminals that lack
// truecolor, so these stay sensible everywhere.
const STATUS_HEX: Record<string, string> = {
  backlog: '#8b8b9e', // hue 240 — blue-grey
  todo: '#4a90e2', //    hue 217 — blue
  wip: '#e8973a', //     hue 38  — orange
  waiting: '#a371e0', // hue 280 — purple
  done: '#4caf6d', //    hue 142 — green
  abandoned: '#6b6b6b', // achromatic — grey
};

const KIND_HEX: Record<string, string> = {
  bug: '#e05252', //     hue 0   — red
  feature: '#9168c0', // hue 262 — purple
  question: '#4a90e2', // hue 217 — blue
  chore: '#8b8b9e', //   hue 240 — grey
  unknown: '#8b8b9e',
};

/**
 * Apply `fn` (a chalk styler) to `text` only when colour is wanted. Gating on the
 * shared {@link isInteractive} keeps colour, spinners and the logo on one switch,
 * so piped / `NO_COLOR` output is plain.
 */
function paint(text: string, fn: (s: string) => string): string {
  return isInteractive() ? fn(text) : text;
}

/** Colour a task status by its semantic hue (unknown statuses pass through plain). */
export function colourStatus(text: string, status: string = text): string {
  const hex = STATUS_HEX[status];
  return hex ? paint(text, chalk.hex(hex)) : text;
}

/** Colour a task kind by its semantic hue. */
export function colourKind(text: string, kind: string = text): string {
  const hex = KIND_HEX[kind];
  return hex ? paint(text, chalk.hex(hex)) : text;
}

/** Colour a priority 0–3: low→dim, normal→plain, high→yellow, urgent→red. */
export function colourPriority(n: number, text: string = String(n)): string {
  if (n <= 0) return paint(text, chalk.dim);
  if (n >= 3) return paint(text, chalk.red);
  if (n === 2) return paint(text, chalk.yellow);
  return text;
}

// Generic accents reused across renderers.
export const success = (t: string): string => paint(t, chalk.green);
export const error = (t: string): string => paint(t, chalk.red);
export const warn = (t: string): string => paint(t, chalk.yellow);
export const dim = (t: string): string => paint(t, chalk.dim);
export const heading = (t: string): string => paint(t, chalk.bold);

/** Colour a yes/no boolean cell green/dim. */
export function colourBool(value: boolean, text: string = value ? 'yes' : 'no'): string {
  return value ? success(text) : dim(text);
}
