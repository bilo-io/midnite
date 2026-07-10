import { describe, expect, it } from 'vitest';
import type { Memory } from '@midnite/shared';
import type { MemorySourceRow } from '../../db/schema';
import { CORPUS_CHAR_BUDGET, buildMemoryCorpus, corpusHasContent } from './corpus';

function memory(content: string): Memory {
  return {
    id: 'm1',
    title: 'Title',
    content,
    projectId: null,
    sources: [],
    archived: false,
    createdAt: 'now',
    updatedAt: 'now',
  };
}

function source(overrides: Partial<MemorySourceRow>): MemorySourceRow {
  return {
    id: 's1',
    memoryId: 'm1',
    url: 'https://example.com',
    kind: 'link',
    title: 'Example',
    faviconUrl: null,
    fetchedAt: null,
    createdAt: 'now',
    position: 0,
    extractedText: null,
    ingestState: null,
    ingestError: null,
    fileName: null,
    mimeType: null,
    storagePath: null,
    byteSize: null,
    ...overrides,
  };
}

describe('buildMemoryCorpus', () => {
  it('stuffs the memory title + content', () => {
    const out = buildMemoryCorpus(memory('Hello body'), []);
    expect(out).toContain('# Title');
    expect(out).toContain('Hello body');
  });

  it('folds in ingested source text but degrades to link-only when not ingested', () => {
    const out = buildMemoryCorpus(memory('Body'), [
      source({ id: 's1', title: 'Ingested', extractedText: 'the extracted body' }),
      source({ id: 's2', title: 'Bare', url: 'https://bare.test', extractedText: null }),
    ]);
    expect(out).toContain('the extracted body');
    expect(out).toContain('Ingested (https://example.com)');
    expect(out).toContain('(link only — body not ingested)');
  });

  it('clips to the char budget', () => {
    const out = buildMemoryCorpus(memory('x'.repeat(CORPUS_CHAR_BUDGET * 2)), []);
    expect(out.length).toBeLessThanOrEqual(CORPUS_CHAR_BUDGET + 20);
    expect(out).toContain('truncated');
  });
});

describe('corpusHasContent', () => {
  it('is true with content, false when empty + no ingested sources', () => {
    expect(corpusHasContent(memory('has'), [])).toBe(true);
    expect(corpusHasContent(memory('   '), [source({ extractedText: null })])).toBe(false);
    expect(corpusHasContent(memory(''), [source({ extractedText: 'body' })])).toBe(true);
  });
});
