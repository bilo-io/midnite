import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  WORDMARK_FONTS,
  WORDMARK_LOGO_FONT,
  WORDMARK_TEXT,
  applyWordmarkCase,
  wordmarkFontVar,
} from './wordmark-fonts';

// The brand face is hard-coded in four places that can't import from each other:
// web's WORDMARK_LOGO_FONT, and the sibling apps' own font declarations (admin +
// site run next/font, docs declares an @font-face). Nothing at runtime notices
// when they drift — a wordmark just silently falls back to sans-serif — so pin
// the invariant here. Paths are relative to packages/web/lib/.
const REPO_ROOT = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(REPO_ROOT, p), 'utf8');

/** The .ttf/.otf basename WORDMARK_LOGO_FONT resolves to in web's layout. */
function brandFontFile(): string {
  const layout = read('packages/web/app/layout.tsx');
  const cssVar = wordmarkFontVar(WORDMARK_LOGO_FONT);
  // e.g. localFont({ src: './fonts/quick-kiss.ttf', variable: '--font-quick-kiss', … })
  const decl = new RegExp(`src: '\\./fonts/([^']+)',\\s*variable: '${cssVar}'`).exec(layout);
  if (!decl?.[1]) throw new Error(`no next/font declaration for ${cssVar} in web/app/layout.tsx`);
  return decl[1];
}

describe('the wordmark brand face', () => {
  it('names a font in the trial set', () => {
    expect(WORDMARK_FONTS.map((f) => f.key)).toContain(WORDMARK_LOGO_FONT);
  });

  it('has its CSS var declared and mounted in web/app/layout.tsx', () => {
    const layout = read('packages/web/app/layout.tsx');
    const cssVar = wordmarkFontVar(WORDMARK_LOGO_FONT);
    // Declared as a next/font variable...
    expect(layout).toContain(`variable: '${cssVar}'`);
    // ...and its binding is in the fontVariables list applied to <html>, or the
    // var never reaches the DOM and <Wordmark /> falls back to sans-serif.
    const binding = new RegExp(`const (\\w+) = localFont\\(\\{[^}]*variable: '${cssVar}'`).exec(
      layout,
    )?.[1];
    expect(binding, `no binding found for ${cssVar}`).toBeTruthy();
    const list = /const fontVariables = \[([\s\S]*?)\]/.exec(layout)?.[1] ?? '';
    expect(list.split(/\s*,\s*/).map((s) => s.trim())).toContain(binding);
  });

  it('is the same face the sibling apps hard-code', () => {
    const file = brandFontFile();
    // admin + site declare it via next/font as `--font-brand`.
    expect(read('packages/admin/app/layout.tsx')).toContain(`'./fonts/${file}'`);
    expect(read('packages/site/app/layout.tsx')).toContain(`'./fonts/${file}'`);
    // docs declares it as a plain @font-face (no next/font — it's a Vite app).
    expect(read('packages/docs/src/styles.css')).toContain(`./fonts/${file}`);
  });
});

describe('the wordmark text', () => {
  it('is the brand name in its public spelling', () => {
    expect(WORDMARK_TEXT).toBe('Midnite');
  });

  it('round-trips through every casing option', () => {
    expect(applyWordmarkCase(WORDMARK_TEXT, 'title')).toBe('Midnite');
    expect(applyWordmarkCase(WORDMARK_TEXT, 'lower')).toBe('midnite');
    expect(applyWordmarkCase(WORDMARK_TEXT, 'upper')).toBe('MIDNITE');
  });
});
