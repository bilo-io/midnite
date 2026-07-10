import { describe, expect, it } from 'vitest';
import type { MemoryCorpus } from '../../memories/memories.service';
import { buildContextText, corpusChars, selectCorpusChunks } from './retrieval';

const corpus = (content: string, sources: { id: string; label: string; text: string }[]): MemoryCorpus => ({
  id: 'm1',
  title: 'My memory',
  content,
  sources,
});

describe('selectCorpusChunks', () => {
  it('keeps the memory doc first, then all sources in order, when under budget', () => {
    const c = corpus('doc body', [
      { id: 's1', label: 'One', text: 'alpha' },
      { id: 's2', label: 'Two', text: 'beta' },
    ]);
    const chunks = selectCorpusChunks(c, ['s1', 's2'], 10_000);
    expect(chunks.map((x) => x.sourceId)).toEqual([null, 's1', 's2']);
    expect(chunks[0]!.label).toBe('My memory');
  });

  it('omits the memory chunk when the doc is empty', () => {
    const chunks = selectCorpusChunks(corpus('   ', [{ id: 's1', label: 'One', text: 'alpha' }]), ['s1']);
    expect(chunks.map((x) => x.sourceId)).toEqual(['s1']);
  });

  it('truncates a memory doc that alone exceeds the budget', () => {
    const chunks = selectCorpusChunks(corpus('x'.repeat(100), []), [], 10);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toHaveLength(10);
  });

  it('trims least-relevant sources over budget, honoring ranked order', () => {
    // budget 20: memory "doc"(3) + then sources by rank until one overflows.
    const c = corpus('doc', [
      { id: 's1', label: 'One', text: 'a'.repeat(10) },
      { id: 's2', label: 'Two', text: 'b'.repeat(10) },
      { id: 's3', label: 'Three', text: 'c'.repeat(10) },
    ]);
    // Rank s2 first, then s1, then s3. used=3(doc)+10(s2)=13; +10(s1)=23>20 → stop.
    const chunks = selectCorpusChunks(c, ['s2', 's1', 's3'], 20);
    expect(chunks.map((x) => x.sourceId)).toEqual([null, 's2']);
  });

  it('appends sources missing from the ranked list in original order', () => {
    const c = corpus('', [
      { id: 's1', label: 'One', text: 'a' },
      { id: 's2', label: 'Two', text: 'b' },
    ]);
    const chunks = selectCorpusChunks(c, ['s2'], 10_000); // s1 absent from ranking
    expect(chunks.map((x) => x.sourceId)).toEqual(['s2', 's1']);
  });
});

describe('buildContextText', () => {
  it('tags source chunks with their id and leaves the memory doc untagged', () => {
    const text = buildContextText([
      { sourceId: null, label: 'My memory', text: 'doc' },
      { sourceId: 's1', label: 'One', text: 'alpha' },
    ]);
    expect(text).toContain('[memory document] My memory\ndoc');
    expect(text).toContain('[source id: s1] One\nalpha');
  });
});

describe('corpusChars', () => {
  it('sums the memory content and every source text', () => {
    expect(
      corpusChars(corpus('abc', [
        { id: 's1', label: 'One', text: 'de' },
        { id: 's2', label: 'Two', text: 'f' },
      ])),
    ).toBe(6);
  });
});
