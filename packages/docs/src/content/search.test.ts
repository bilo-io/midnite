import { describe, expect, it } from 'vitest';

import { buildSearchIndex, extractHeadings, parseFrontmatter, searchDocs, type SearchDoc } from './search';

describe('parseFrontmatter', () => {
  it('reads title + section from a leading YAML block', () => {
    expect(parseFrontmatter('---\ntitle: Button\nsection: Components\norder: 0\n---\n# Button')).toEqual({
      title: 'Button',
      section: 'Components',
    });
  });

  it('strips surrounding quotes and ignores body that has no frontmatter', () => {
    expect(parseFrontmatter('---\ntitle: "Getting started"\n---\n')).toEqual({ title: 'Getting started' });
    expect(parseFrontmatter('# Just a heading')).toEqual({});
  });
});

describe('extractHeadings', () => {
  it('collects ATX headings in order and trims trailing hashes', () => {
    expect(extractHeadings('# Title\n\n## Usage\n\n### Props ###\ntext')).toEqual(['Title', 'Usage', 'Props']);
  });

  it('ignores `#` inside fenced code blocks', () => {
    const body = '# Real\n\n```sh\n# not a heading\npnpm add x\n```\n\n## Also real';
    expect(extractHeadings(body)).toEqual(['Real', 'Also real']);
  });
});

describe('searchDocs', () => {
  const index: SearchDoc[] = buildSearchIndex([
    { path: '/components/button', title: 'Button', section: 'Components', body: '# Button\n## Variants' },
    { path: '/architecture', title: 'Architecture', section: 'Architecture', body: '# Architecture\n## Gateway' },
    { path: '/guides/readme', title: 'README', section: 'Guides', body: '# midnite\n## Quick start' },
  ]);

  it('returns nothing for an empty query', () => {
    expect(searchDocs(index, '   ')).toEqual([]);
  });

  it('matches titles case-insensitively', () => {
    const hits = searchDocs(index, 'button');
    expect(hits.map((h) => h.path)).toEqual(['/components/button']);
    expect(hits[0]?.match).toBe('Button');
  });

  it('matches a heading when no title matches, surfacing the heading as `match`', () => {
    const hits = searchDocs(index, 'gateway');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ path: '/architecture', match: 'Gateway' });
  });

  it('ranks title hits ahead of heading hits', () => {
    // "arch" hits the Architecture title and the README has no such heading.
    const hits = searchDocs(index, 'arch');
    expect(hits[0]?.path).toBe('/architecture');
  });
});
