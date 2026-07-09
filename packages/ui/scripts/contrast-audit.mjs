/**
 * Phase 60 Theme I — WCAG contrast audit for the design-system tokens.
 *
 * Parses the `:root` (light) and `.dark` HSL token triplets from
 * `src/styles/tokens.css` and computes the WCAG 2.1 contrast ratio for every
 * meaningful foreground/background pair in both themes, flagging any that miss
 * AA (4.5:1 normal text, 3:1 large text / UI components).
 *
 * Run: `node scripts/contrast-audit.mjs` (from packages/ui). Exits non-zero if
 * any pair fails its threshold, so it can gate CI later; today it's the evidence
 * source for the Theme I findings report (color-contrast is disabled in the axe
 * story gate precisely because this does it more precisely, per-theme).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, '../src/styles/tokens.css'), 'utf8');

/** Parse `--name: H S% L%;` triplets out of the first `{...}` after `selector`. */
function parseBlock(selector) {
  const start = css.indexOf(selector);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  const tokens = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)) {
    tokens[m[1]] = { h: +m[2], s: +m[3], l: +m[4] };
  }
  return tokens;
}

function hslToRgb({ h, s, l }) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

// WCAG relative luminance: 0.2126 R + 0.7152 G + 0.0722 B on linearised channels.
function luminance(hsl) {
  const [r, g, b] = hslToRgb(hsl).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// fg token → bg token pairs that actually render as text/UI in the app.
const PAIRS = [
  ['foreground', 'background'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'muted'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['success-foreground', 'success'],
];

const AA_NORMAL = 4.5;
let failures = 0;

for (const [label, sel] of [
  ['light', ':root'],
  ['dark', '.dark'],
]) {
  const t = parseBlock(sel);
  console.log(`\n${label} theme (${sel})`);
  for (const [fg, bg] of PAIRS) {
    if (!t[fg] || !t[bg]) continue;
    const r = ratio(t[fg], t[bg]);
    const pass = r >= AA_NORMAL;
    if (!pass) failures += 1;
    console.log(
      `  ${pass ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  ${fg} on ${bg}` +
        (pass ? '' : `  (needs ${AA_NORMAL}:1 for normal text; ${r >= 3 ? 'ok for large/UI' : 'fails 3:1 too'})`),
    );
  }
}

console.log(`\n${failures} pair(s) below WCAG AA (4.5:1).`);
process.exit(failures > 0 ? 1 : 0);
