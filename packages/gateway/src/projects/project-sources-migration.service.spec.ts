import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb, type TestDbHandle } from '../test';
import type { SearchIndexService } from '../search/search-index.service';
import { ProjectSourcesMigrationService } from './project-sources-migration.service';

let handle: TestDbHandle;
let sqlite: Database.Database;

beforeEach(() => {
  handle = createTestDb();
  sqlite = handle.sqlite;
});
afterEach(() => handle.close());

const NOW = '2026-07-01T00:00:00.000Z';

function insertProject(id: string, name: string): void {
  sqlite
    .prepare(
      `INSERT INTO projects (id, name, tag, color, created_at, updated_at)
       VALUES (?, ?, ?, '#000000', ?, ?)`,
    )
    .run(id, name, id, NOW, NOW);
}

function insertSource(
  s: { id: string; projectId: string; url: string; kind?: string; title?: string; position?: number },
): void {
  sqlite
    .prepare(
      `INSERT INTO project_sources (id, project_id, url, kind, title, favicon_url, fetched_at, created_at, position)
       VALUES (@id, @projectId, @url, @kind, @title, NULL, NULL, @createdAt, @position)`,
    )
    .run({
      id: s.id,
      projectId: s.projectId,
      url: s.url,
      kind: s.kind ?? 'link',
      title: s.title ?? null,
      createdAt: NOW,
      position: s.position ?? 0,
    });
}

const memoriesOf = (projectId: string): Array<{ id: string; title: string; project_id: string }> =>
  sqlite.prepare('SELECT id, title, project_id FROM memories WHERE project_id = ?').all(projectId) as never;

const sourcesOf = (memoryId: string): Array<{ url: string; kind: string; title: string | null; position: number }> =>
  sqlite
    .prepare('SELECT url, kind, title, position FROM memory_sources WHERE memory_id = ? ORDER BY position')
    .all(memoryId) as never;

const tableExists = (name: string): boolean =>
  Boolean(sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(name));

describe('ProjectSourcesMigrationService', () => {
  it('migrates a project’s sources into a "{name} — knowledge" memory (order + metadata preserved) and drops the table', () => {
    insertProject('p1', 'Billing');
    insertSource({ id: 's0', projectId: 'p1', url: 'https://a.example', kind: 'github', title: 'A', position: 1 });
    insertSource({ id: 's1', projectId: 'p1', url: 'https://b.example', kind: 'figma', title: 'B', position: 0 });
    const searchIndex = { upsert: vi.fn() } as unknown as SearchIndexService;

    new ProjectSourcesMigrationService(sqlite, searchIndex).onModuleInit();

    const memories = memoriesOf('p1');
    expect(memories).toHaveLength(1);
    expect(memories[0]!.title).toBe('Billing — knowledge');

    // Ordered by original position, metadata carried across.
    const sources = sourcesOf(memories[0]!.id);
    expect(sources.map((s) => s.url)).toEqual(['https://b.example', 'https://a.example']);
    expect(sources.map((s) => s.kind)).toEqual(['figma', 'github']);
    expect(sources.map((s) => s.position)).toEqual([0, 1]);

    // Legacy table is gone; the new memory was indexed.
    expect(tableExists('project_sources')).toBe(false);
    expect((searchIndex.upsert as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: a re-run does not duplicate (table already dropped)', () => {
    insertProject('p1', 'Billing');
    insertSource({ id: 's0', projectId: 'p1', url: 'https://a.example' });

    const svc = new ProjectSourcesMigrationService(sqlite, undefined);
    svc.onModuleInit();
    svc.onModuleInit(); // no-op — table is gone

    expect(memoriesOf('p1')).toHaveLength(1);
  });

  it('skips a project that already has its knowledge memory (idempotent by title)', () => {
    insertProject('p1', 'Billing');
    insertSource({ id: 's0', projectId: 'p1', url: 'https://a.example' });
    // Pre-existing knowledge memory (as if a prior run created it).
    sqlite
      .prepare(
        `INSERT INTO memories (id, title, content, project_id, created_at, updated_at)
         VALUES ('m-pre', 'Billing — knowledge', '', 'p1', ?, ?)`,
      )
      .run(NOW, NOW);

    new ProjectSourcesMigrationService(sqlite, undefined).onModuleInit();

    const memories = memoriesOf('p1');
    expect(memories).toHaveLength(1);
    expect(memories[0]!.id).toBe('m-pre');
    // The pre-existing memory wasn't backfilled with sources.
    expect(sourcesOf('m-pre')).toHaveLength(0);
    expect(tableExists('project_sources')).toBe(false);
  });

  it('creates no memory for a project with no sources, and drops the table on an empty set', () => {
    insertProject('p1', 'Empty');

    new ProjectSourcesMigrationService(sqlite, undefined).onModuleInit();

    expect(memoriesOf('p1')).toHaveLength(0);
    expect(tableExists('project_sources')).toBe(false);
  });

  it('skips orphan sources whose project no longer exists', () => {
    insertSource({ id: 's0', projectId: 'ghost', url: 'https://a.example' });

    new ProjectSourcesMigrationService(sqlite, undefined).onModuleInit();

    expect(memoriesOf('ghost')).toHaveLength(0);
    expect(tableExists('project_sources')).toBe(false);
  });
});
