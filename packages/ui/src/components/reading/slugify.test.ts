import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { claimSlug, extractText, slugify, type SlugRegistry } from './slugify';

describe('extractText', () => {
  it('reads a plain string heading', () => {
    expect(extractText('Getting started')).toBe('Getting started');
  });

  it('walks nested elements so wrapped text is not dropped', () => {
    // `## The \`cn()\` helper` compiles to [string, <code>, string].
    const children = ['The ', createElement('code', null, 'cn()'), ' helper'];
    expect(extractText(children)).toBe('The cn() helper');
  });

  it('reads text out of deeply nested markup', () => {
    const children = createElement('em', null, createElement('strong', null, 'Deep'));
    expect(extractText(children)).toBe('Deep');
  });

  it('includes numeric children and ignores non-renderable ones', () => {
    expect(extractText(['Phase ', 80, null, undefined, false])).toBe('Phase 80');
  });
});

describe('slugify', () => {
  it('lower-cases and hyphenates', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
  });

  it('drops punctuation, keeping the words either side separate', () => {
    expect(slugify('The cn() helper')).toBe('the-cn-helper');
  });

  it('strips accents rather than dropping the letter', () => {
    expect(slugify('Café résumé')).toBe('cafe-resume');
  });

  it('collapses runs of whitespace and hyphens, and trims the edges', () => {
    expect(slugify('  Spaced   out — really  ')).toBe('spaced-out-really');
  });

  it('returns an empty string when nothing survives', () => {
    expect(slugify('!!! ???')).toBe('');
  });
});

describe('claimSlug', () => {
  it('returns the bare slug the first time', () => {
    const registry: SlugRegistry = new Map();
    expect(claimSlug(registry, 'Overview')).toBe('overview');
  });

  it('suffixes repeats so duplicate headings get distinct anchors', () => {
    const registry: SlugRegistry = new Map();
    expect(claimSlug(registry, 'Overview')).toBe('overview');
    expect(claimSlug(registry, 'Overview')).toBe('overview-1');
    expect(claimSlug(registry, 'Overview')).toBe('overview-2');
  });

  it('keeps separate registries independent, so two articles never collide', () => {
    const a: SlugRegistry = new Map();
    const b: SlugRegistry = new Map();
    expect(claimSlug(a, 'Intro')).toBe('intro');
    expect(claimSlug(b, 'Intro')).toBe('intro');
  });

  it('falls back to a positional id when the text slugifies to nothing', () => {
    const registry: SlugRegistry = new Map();
    expect(claimSlug(registry, '???')).toBe('section-1');
    expect(claimSlug(registry, '!!!')).toBe('section-2');
  });
});
