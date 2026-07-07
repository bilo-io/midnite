import { describe, expect, it } from 'vitest';
import { markdownToDeck, markdownToHtml, formatInline, slugify, highlightCode } from './markdown';

describe('markdownToDeck', () => {
  it('turns the first # into a cover slide and the deck title', () => {
    const deck = markdownToDeck('# Hello world\n\n## First\n\n- a');
    expect(deck.title).toBe('Hello world');
    expect(deck.slides[0]).toMatchObject({ title: 'Hello world', cover: true });
  });

  it('starts a new slide at every heading of level >= 2', () => {
    const deck = markdownToDeck('# Deck\n\n## One\n\n- x\n\n## Two\n\n- y');
    expect(deck.slides.map((s) => s.title)).toEqual(['Deck', 'One', 'Two']);
  });

  it('makes each list item, paragraph, code fence and table its own step', () => {
    const md = [
      '## Slide',
      '',
      '- bullet one',
      '- bullet two',
      '',
      'A paragraph.',
      '',
      '```ts',
      'const x = 1;',
      '```',
      '',
      '| a | b |',
      '| --- | --- |',
      '| 1 | 2 |',
    ].join('\n');
    const deck = markdownToDeck(md);
    const slide = deck.slides[0]!;
    // two bullets + one paragraph + one code block + one table
    expect(slide.steps).toHaveLength(5);
    expect(slide.steps.some((s) => s.includes('md-code-wrap'))).toBe(true);
    expect(slide.steps.some((s) => s.includes('md-table-wrap'))).toBe(true);
  });

  it('strips leading section numbering from headings', () => {
    const deck = markdownToDeck('# D\n\n## 3.1 Deep dive');
    expect(deck.slides[1]!.title).toBe('Deep dive');
  });

  it('falls back to a single slide when there are no headings', () => {
    const deck = markdownToDeck('Just a title line\n\n- point a\n- point b');
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0]!.title).toBe('Just a title line');
    expect(deck.slides[0]!.steps).toHaveLength(2);
  });

  it('wraps cover-slide paragraphs in a lede span', () => {
    const deck = markdownToDeck('# Cover\n\nAn intro paragraph');
    expect(deck.slides[0]!.steps[0]).toContain('class="lede"');
  });
});

describe('formatInline', () => {
  it('renders code, links and bold, escaping plain text', () => {
    expect(formatInline('a `code` b')).toContain('<code');
    expect(formatInline('[label](https://x.com)')).toContain('href="https://x.com"');
    expect(formatInline('**bold**')).toContain('<strong>bold</strong>');
    expect(formatInline('<script>')).toBe('&lt;script&gt;');
  });

  it('rejects javascript: urls, rendering the label as text', () => {
    // eslint-disable-next-line no-script-url -- testing that the sanitizer drops it
    const out = formatInline('[click](javascript:alert(1))');
    expect(out).not.toContain('href');
    expect(out).toContain('click');
  });
});

describe('markdownToHtml', () => {
  it('renders headings, lists and paragraphs for the preview', () => {
    const html = markdownToHtml('# Title\n\n- item\n\ntext');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<li>item</li>');
    expect(html).toContain('<p>text</p>');
  });
});

describe('highlightCode (highlight.js)', () => {
  it('emits language-aware .hljs-* spans for a recognized language', () => {
    const out = highlightCode('const x = 1;', 'ts');
    expect(out).toContain('hljs-keyword');
    expect(out).toContain('hljs-number');
  });

  it('resolves fence aliases (sh -> bash, py -> python)', () => {
    expect(highlightCode('echo "hi"', 'sh')).toContain('hljs-');
    expect(highlightCode('def f():\n    pass', 'py')).toContain('hljs-keyword');
  });

  it('escapes HTML in the source so markup can never break out', () => {
    const out = highlightCode('<script>alert(1)</script>', 'html');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;');
  });

  it('falls back to plainly-escaped text for an unknown language', () => {
    const out = highlightCode('<b> & "x"', 'no-such-lang');
    expect(out).not.toContain('hljs-');
    expect(out).toBe('&lt;b&gt; &amp; &quot;x&quot;');
  });

  it('tags a rendered code fence with the hljs + language class', () => {
    const deck = markdownToDeck('## S\n\n```ts\nconst x = 1;\n```');
    const step = deck.slides[0]!.steps[0]!;
    expect(step).toContain('class="hljs language-ts"');
    expect(step).toContain('hljs-keyword');
  });
});

describe('slugify', () => {
  it('lowercases, dashes non-alphanumerics and falls back to "deck"', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('***')).toBe('deck');
  });
});
