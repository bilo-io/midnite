import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { MemoriesRepository } from './memories.repository';

// Exercises the real Drizzle queries + migration 0013 (memory_sources, position)
// against an in-memory SQLite — the service tests use an in-memory fake repo.
function makeRepo() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return new MemoriesRepository(db);
}

let repo: MemoriesRepository;
const now = '2026-06-04T00:00:00.000Z';

beforeEach(() => {
  repo = makeRepo();
});

function seedMemory(id: string, projectId: string | null = null) {
  repo.insertMemory({ id, title: id, content: '', projectId, createdAt: now, updatedAt: now });
}

function seedSource(memoryId: string, id: string, position: number) {
  repo.insertSource({
    id,
    memoryId,
    url: `https://example.com/${id}`,
    kind: 'link',
    createdAt: now,
    position,
  });
}

describe('MemoriesRepository', () => {
  it('hydrates a memory with its sources in position order', () => {
    seedMemory('m1');
    seedSource('m1', 's1', 0);
    seedSource('m1', 's2', 1);

    const memory = repo.hydrate(repo.getMemory('m1')!);
    expect(memory.sources.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(memory.sources[0]!.kind).toBe('link');
  });

  it('reorders sources by writing each id its index as position', () => {
    seedMemory('m1');
    seedSource('m1', 's0', 0);
    seedSource('m1', 's1', 1);
    seedSource('m1', 's2', 2);

    repo.reorderSources('m1', ['s2', 's0', 's1']);
    expect(repo.listSources('m1').map((s) => s.id)).toEqual(['s2', 's0', 's1']);
  });

  it('nextSourcePosition is the max existing position + 1', () => {
    seedMemory('m1');
    expect(repo.nextSourcePosition('m1')).toBe(0);
    seedSource('m1', 's0', 0);
    seedSource('m1', 's1', 1);
    expect(repo.nextSourcePosition('m1')).toBe(2);
  });

  it('deleting a memory cascades its sources', () => {
    seedMemory('m1');
    seedSource('m1', 's1', 0);
    repo.deleteMemory('m1');
    expect(repo.getMemory('m1')).toBeUndefined();
    expect(repo.listSources('m1')).toHaveLength(0);
  });

  it('listScoped returns global plus the project memories only', () => {
    seedMemory('g', null);
    seedMemory('p1', 'proj-1');
    seedMemory('p2', 'proj-2');

    const ids = repo.listScoped('proj-1').map((m) => m.id).sort();
    expect(ids).toEqual(['g', 'p1']);
  });

  it('stores a file source (null url) and patches ingestion state (Phase 65 B)', () => {
    seedMemory('m1');
    repo.insertSource({
      id: 'f1',
      memoryId: 'm1',
      url: null,
      kind: 'file',
      fileName: 'notes.pdf',
      mimeType: 'application/pdf',
      storagePath: 'memory-sources/abc.pdf',
      byteSize: 1234,
      ingestState: 'pending',
      createdAt: now,
      position: 0,
    });

    const before = repo.hydrate(repo.getMemory('m1')!).sources[0]!;
    expect(before.url).toBeUndefined();
    expect(before.kind).toBe('file');
    expect(before.fileName).toBe('notes.pdf');
    expect(before.ingestState).toBe('pending');

    repo.updateSource('m1', 'f1', { extractedText: 'hello world', ingestState: 'ready' });
    const after = repo.hydrate(repo.getMemory('m1')!).sources[0]!;
    expect(after.ingestState).toBe('ready');
    // extractedText stays server-side, not in the client shape.
    expect('extractedText' in after).toBe(false);
    // The row still holds the text (for FTS/chat grounding).
    expect(repo.getSource('m1', 'f1')!.extractedText).toBe('hello world');
  });
});
