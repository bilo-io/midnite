import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown';

describe('parseInline', () => {
  it('returns a single text token for plain text', () => {
    expect(parseInline('just words')).toEqual([{ type: 'text', value: 'just words' }]);
  });

  it('parses bold, code, and links interleaved with text', () => {
    expect(parseInline('a **b** and `c` see [docs](https://x.dev) end')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'bold', value: 'b' },
      { type: 'text', value: ' and ' },
      { type: 'code', value: 'c' },
      { type: 'text', value: ' see ' },
      { type: 'link', text: 'docs', href: 'https://x.dev' },
      { type: 'text', value: ' end' },
    ]);
  });

  it('handles a leading bold span with no preceding text', () => {
    expect(parseInline('**Added** — a thing')).toEqual([
      { type: 'bold', value: 'Added' },
      { type: 'text', value: ' — a thing' },
    ]);
  });
});

describe('parseMarkdown', () => {
  it('parses headings at levels 1–3 (capping deeper ones)', () => {
    const blocks = parseMarkdown('# One\n\n## Two\n\n### Three\n\n#### Four');
    expect(blocks.map((b) => b.type === 'heading' && b.level)).toEqual([1, 2, 3, 3]);
  });

  it('groups consecutive bullets into one list and parses inline spans', () => {
    const blocks = parseMarkdown('- **a** first\n- second [l](https://x)\n');
    expect(blocks).toHaveLength(1);
    const list = blocks[0];
    if (!list || list.type !== 'list') throw new Error('expected list');
    expect(list.items).toHaveLength(2);
    expect(list.items[0]?.[0]).toEqual({ type: 'bold', value: 'a' });
    expect(list.items[1]).toContainEqual({ type: 'link', text: 'l', href: 'https://x' });
  });

  it('merges an indented continuation line into the preceding list item', () => {
    const blocks = parseMarkdown('- start of a **bold**\n  wrapped tail\n');
    const list = blocks[0];
    if (!list || list.type !== 'list') throw new Error('expected list');
    const item = list.items[0] ?? [];
    const flattened = item.map((t) => ('value' in t ? t.value : t.text)).join('');
    expect(flattened).toContain('wrapped tail');
    // The bold span survives the merge (not flattened to plain text).
    expect(item).toContainEqual({ type: 'bold', value: 'bold' });
  });

  it('collects prose into paragraph blocks split on blank lines', () => {
    const blocks = parseMarkdown('line one\nline two\n\nsecond para');
    expect(blocks.filter((b) => b.type === 'paragraph')).toHaveLength(2);
  });

  it('returns no blocks for empty input', () => {
    expect(parseMarkdown('')).toEqual([]);
  });
});
