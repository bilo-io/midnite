import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test';
import { MemoryChatRepository } from './memory-chat.repository';

let handle: TestDbHandle;
let repo: MemoryChatRepository;

beforeEach(() => {
  handle = createTestDb();
  repo = new MemoryChatRepository(handle.db, handle.sqlite);
});
afterEach(() => handle.close());

describe('MemoryChatRepository messages', () => {
  it('persists a thread oldest-first and round-trips citations + error', () => {
    repo.insertMessage({
      id: 'u1',
      memoryId: 'm1',
      role: 'user',
      content: 'why?',
      createdAt: '2026-07-10T00:00:00.000Z',
    });
    repo.insertMessage({
      id: 'a1',
      memoryId: 'm1',
      role: 'assistant',
      content: 'because',
      citations: ['s1', 's2'],
      createdAt: '2026-07-10T00:00:01.000Z',
    });
    repo.insertMessage({
      id: 'a2',
      memoryId: 'm1',
      role: 'assistant',
      content: 'oops',
      error: true,
      createdAt: '2026-07-10T00:00:02.000Z',
    });
    // A different memory's turn is not returned.
    repo.insertMessage({ id: 'x', memoryId: 'm2', role: 'user', content: 'hi', createdAt: '2026-07-10T00:00:03.000Z' });

    const thread = repo.listMessages('m1');
    expect(thread.map((m) => m.id)).toEqual(['u1', 'a1', 'a2']);
    expect(thread[1]!.citations).toEqual(['s1', 's2']);
    expect(thread[0]!.citations).toEqual([]);
    expect(thread[2]!.error).toBe(true);
    expect(thread[1]!.error).toBeUndefined();
  });
});

describe('MemoryChatRepository.rankSourceIdsByRelevance', () => {
  const sources = [
    { id: 's1', text: 'The quick brown fox jumps over the lazy dog' },
    { id: 's2', text: 'Lorem ipsum dolor sit amet consectetur' },
    { id: 's3', text: 'A fox and a hound are unlikely friends' },
  ];

  it('ranks matching sources first and appends non-matching in original order', () => {
    const ranked = repo.rankSourceIdsByRelevance('fox', sources);
    // s1 + s3 mention "fox" (ranked first, either order); s2 has no match → last.
    expect(ranked).toHaveLength(3);
    expect(ranked.slice(0, 2).sort()).toEqual(['s1', 's3']);
    expect(ranked[2]).toBe('s2');
  });

  it('falls back to original order when the query has no searchable terms', () => {
    expect(repo.rankSourceIdsByRelevance('   ', sources)).toEqual(['s1', 's2', 's3']);
  });

  it('handles FTS syntax characters in the query without throwing', () => {
    const ranked = repo.rankSourceIdsByRelevance('"fox* (dog)', sources);
    expect(ranked).toHaveLength(3);
  });
});
