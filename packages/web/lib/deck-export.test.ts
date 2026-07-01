import { describe, expect, it } from 'vitest';
import {
  REVEAL_CDN_VERSION,
  buildStandaloneHtml,
  deckSlug,
  resolveThemeColors,
} from './deck-export';

describe('deckSlug', () => {
  it('slugifies a deck name', () => {
    expect(deckSlug('My Q3 Roadmap!')).toBe('my-q3-roadmap');
  });
  it('falls back to "deck" for empty/symbol-only names', () => {
    expect(deckSlug('!!!')).toBe('deck');
  });
});

describe('buildStandaloneHtml', () => {
  const colors = { background: 'hsl(0 0% 0%)', foreground: 'hsl(0 0% 100%)', accent: 'hsl(200 50% 50%)' };

  it('produces a self-contained reveal document with the deck name + slides', () => {
    const html = buildStandaloneHtml({
      name: 'Kickoff',
      slidesHtml: '<section><h1>Hi</h1></section>',
      colors,
    });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>Kickoff</title>');
    expect(html).toContain('<section><h1>Hi</h1></section>');
    expect(html).toContain('RevealMarkdown');
  });

  it('loads reveal from the pinned CDN version and inlines the theme colours', () => {
    const html = buildStandaloneHtml({ name: 'X', slidesHtml: '', colors });
    expect(html).toContain(`reveal.js@${REVEAL_CDN_VERSION}/dist/reveal.js`);
    expect(html).toContain(`reveal.js@${REVEAL_CDN_VERSION}/dist/reveal.css`);
    expect(html).toContain('--r-background-color: hsl(0 0% 0%)');
    expect(html).toContain('--r-link-color: hsl(200 50% 50%)');
  });

  it('escapes HTML in the deck title', () => {
    const html = buildStandaloneHtml({ name: '<script>x</script>', slidesHtml: '', colors });
    expect(html).toContain('<title>&lt;script&gt;x&lt;/script&gt;</title>');
    expect(html).not.toContain('<title><script>');
  });
});

describe('resolveThemeColors', () => {
  it('wraps per-deck HSL-triplet overrides in hsl()', () => {
    const c = resolveThemeColors({ background: '222 47% 11%', accent: '10 90% 50%' });
    expect(c.background).toBe('hsl(222 47% 11%)');
    expect(c.accent).toBe('hsl(10 90% 50%)');
    // foreground unset → jsdom has no app vars → falls back to the default.
    expect(c.foreground).toMatch(/^hsl\(/);
  });
});
