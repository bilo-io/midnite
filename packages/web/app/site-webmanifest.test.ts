import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The web manifest is a static file (no runtime), so guard its PWA-critical
 * fields here: a real name, theme-aware (not hardcoded-white) colours, an
 * in-scope start_url, standalone display, and a maskable icon. A regression
 * (e.g. reverting to the empty stub) breaks installability silently otherwise.
 */
const manifest = JSON.parse(
  // vitest runs with cwd = packages/web; `import.meta.url` is an http URL here,
  // so resolve from cwd rather than the module URL.
  readFileSync(resolve(process.cwd(), 'public/site.webmanifest'), 'utf8'),
) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
};

describe('site.webmanifest', () => {
  it('has a real name and standalone display', () => {
    expect(manifest.name).toBe('midnite');
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
  });

  it('uses theme-aware colours, not hardcoded white', () => {
    expect(manifest.theme_color.toLowerCase()).not.toBe('#ffffff');
    expect(manifest.background_color.toLowerCase()).not.toBe('#ffffff');
  });

  it('has an in-scope start_url', () => {
    expect(manifest.scope).toBe('/');
    expect(manifest.start_url.startsWith('/')).toBe(true);
  });

  it('declares a 192, a 512, and a maskable icon', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => (i.purpose ?? '').includes('maskable'))).toBe(true);
  });
});
