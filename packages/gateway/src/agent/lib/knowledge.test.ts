import { describe, expect, it } from 'vitest';
import {
  buildKnowledgeBlock,
  extractHeadings,
  renderManifest,
  validateSelection,
} from './knowledge';

describe('extractHeadings', () => {
  it('pulls ATX headings in order', () => {
    const md = '# Title\n\nsome text\n\n## Section A\n\n### Sub\ntext\n## Section B';
    expect(extractHeadings(md)).toEqual(['Title', 'Section A', 'Sub', 'Section B']);
  });

  it('ignores non-heading hashes and strips trailing #', () => {
    expect(extractHeadings('not # a heading\n## Real ##\ntext')).toEqual(['Real']);
  });

  it('caps the number of headings', () => {
    const md = Array.from({ length: 30 }, (_, i) => `# H${i}`).join('\n');
    expect(extractHeadings(md, 5)).toHaveLength(5);
  });
});

describe('renderManifest', () => {
  it('lists files with their headings', () => {
    const out = renderManifest([
      { file: 'a.md', headings: ['One', 'Two'] },
      { file: 'sub/b.md', headings: [] },
    ]);
    expect(out).toBe('- a.md — One · Two\n- sub/b.md');
  });
});

describe('validateSelection', () => {
  const known = new Set(['a.md', 'b.md', 'c.md']);

  it('keeps only known files, de-duped and capped', () => {
    expect(validateSelection(['a.md', 'a.md', 'b.md', 'nope.md'], known)).toEqual(['a.md', 'b.md']);
  });

  it('returns [] for non-arrays or all-unknown', () => {
    expect(validateSelection('a.md', known)).toEqual([]);
    expect(validateSelection(['x.md'], known)).toEqual([]);
    expect(validateSelection(undefined, known)).toEqual([]);
  });

  it('respects the max', () => {
    expect(validateSelection(['a.md', 'b.md', 'c.md'], known, 2)).toEqual(['a.md', 'b.md']);
  });
});

describe('buildKnowledgeBlock', () => {
  it('returns empty for no (usable) files', () => {
    expect(buildKnowledgeBlock([], 1000)).toBe('');
    expect(buildKnowledgeBlock([{ file: 'a.md', content: '   ' }], 1000)).toBe('');
  });

  it('includes whole files under the cap, headed by filename', () => {
    const block = buildKnowledgeBlock(
      [
        { file: 'a.md', content: 'alpha' },
        { file: 'b.md', content: 'beta' },
      ],
      1000,
    );
    expect(block).toContain('## Knowledge files');
    expect(block).toContain('### a.md\n\nalpha');
    expect(block).toContain('### b.md\n\nbeta');
  });

  it('stops at the byte cap and truncates an overflowing file', () => {
    const big = 'x'.repeat(5000);
    const block = buildKnowledgeBlock([{ file: 'big.md', content: big }], 1024);
    expect(block).toContain('### big.md');
    expect(block).toContain('…(truncated)');
    // The injected slice is bounded near the cap, not the full 5000 bytes.
    expect(block.length).toBeLessThan(1500);
  });

  it('drops a file that would overflow once earlier files filled the budget', () => {
    const block = buildKnowledgeBlock(
      [
        { file: 'a.md', content: 'x'.repeat(900) },
        { file: 'b.md', content: 'y'.repeat(900) },
      ],
      1000,
    );
    expect(block).toContain('### a.md');
    expect(block).not.toContain('### b.md');
  });
});
