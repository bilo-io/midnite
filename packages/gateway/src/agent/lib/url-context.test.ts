import { describe, expect, it } from 'vitest';
import {
  MAX_CONTEXT_URLS,
  buildContextBlock,
  extractUrls,
  htmlToText,
  truncate,
} from './url-context';

describe('extractUrls', () => {
  it('pulls distinct http(s) urls in order, trimming trailing punctuation', () => {
    const text = 'see https://github.com/o/r/issues/1, and https://example.com/page). dup https://github.com/o/r/issues/1';
    expect(extractUrls(text)).toEqual([
      'https://github.com/o/r/issues/1',
      'https://example.com/page',
    ]);
  });

  it('ignores non-http schemes and bare words', () => {
    expect(extractUrls('ftp://x.com nope www.foo.com plain text')).toEqual([]);
  });

  it('caps the number of urls', () => {
    const many = Array.from({ length: MAX_CONTEXT_URLS + 3 }, (_, i) => `https://h${i}.com/p`).join(' ');
    expect(extractUrls(many)).toHaveLength(MAX_CONTEXT_URLS);
  });
});

describe('truncate', () => {
  it('leaves short strings and ellipsizes long ones', () => {
    expect(truncate('abc', 5)).toBe('abc');
    expect(truncate('abcdef', 3)).toBe('abc…');
  });
});

describe('htmlToText', () => {
  it('drops script/style, strips tags, decodes entities, and collapses whitespace', () => {
    const html = '<head><title>t</title></head><body><script>evil()</script><h1>Hi &amp; bye</h1>\n  <p>line</p></body>';
    expect(htmlToText(html)).toBe('Hi & bye line');
  });
});

describe('buildContextBlock', () => {
  it('returns empty string for no contexts', () => {
    expect(buildContextBlock([])).toBe('');
  });

  it('renders a heading per source with title + url and the body', () => {
    const block = buildContextBlock([
      { url: 'https://github.com/o/r/issues/1', title: 'o/r#1: Fix it', body: 'State: open\n\nthe body' },
      { url: 'https://example.com', body: 'just text' },
    ]);
    expect(block).toContain('## Linked context');
    expect(block).toContain('### o/r#1: Fix it');
    expect(block).toContain('https://github.com/o/r/issues/1');
    expect(block).toContain('the body');
    // No title → heading is just the url.
    expect(block).toContain('### https://example.com');
  });

  it('caps the overall block length', () => {
    const big = { url: 'https://x.com', body: 'x'.repeat(50_000) };
    const block = buildContextBlock([big], 500);
    expect(block.length).toBeLessThanOrEqual(500 + '\n…(context truncated)\n'.length);
    expect(block).toContain('(context truncated)');
  });
});
