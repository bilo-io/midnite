import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import type { MidniteDb } from '../db/db.module';
import { SearchIndexService } from './search-index.service';

function makeService(): SearchIndexService {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema }) as unknown as MidniteDb;
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return new SearchIndexService(db);
}

describe('SearchIndexService', () => {
  let svc: SearchIndexService;

  beforeEach(() => {
    svc = makeService();
  });

  it('starts empty and indexes on upsert', () => {
    expect(svc.count()).toBe(0);
    svc.upsert({ type: 'task', entityId: 't1', title: 'Fix OAuth login', body: 'token flow broken' });
    expect(svc.count()).toBe(1);

    const { hits, total } = svc.query('"oauth"*', { limit: 10 });
    expect(total).toBe(1);
    expect(hits[0]).toMatchObject({ type: 'task', entityId: 't1', title: 'Fix OAuth login' });
    expect(hits[0]!.snippet).toContain('<mark>');
    expect(hits[0]!.score).toBeGreaterThan(0);
  });

  it('upsert replaces the prior row rather than duplicating', () => {
    svc.upsert({ type: 'note', entityId: 'n1', title: 'old', body: 'alpha' });
    svc.upsert({ type: 'note', entityId: 'n1', title: 'new', body: 'beta' });
    expect(svc.count()).toBe(1);
    expect(svc.query('"alpha"*', { limit: 10 }).total).toBe(0);
    expect(svc.query('"beta"*', { limit: 10 }).hits[0]?.title).toBe('new');
  });

  it('ranks a title match above a body-only match', () => {
    svc.upsert({ type: 'task', entityId: 'body', title: 'unrelated', body: 'mentions deploy once' });
    svc.upsert({ type: 'task', entityId: 'title', title: 'Deploy pipeline', body: 'unrelated' });
    const hits = svc.query('"deploy"*', { limit: 10 }).hits;
    expect(hits.map((h) => h.entityId)).toEqual(['title', 'body']);
  });

  it('filters by type and reports counts per type', () => {
    svc.upsert({ type: 'task', entityId: 't1', title: 'shared term', body: '' });
    svc.upsert({ type: 'note', entityId: 'n1', title: 'shared term', body: '' });
    svc.upsert({ type: 'note', entityId: 'n2', title: 'shared term', body: '' });

    const all = svc.query('"shared"*', { limit: 10 });
    expect(all.total).toBe(3);
    expect(all.byType).toEqual({ task: 1, note: 2 });

    const notesOnly = svc.query('"shared"*', { type: 'note', limit: 10 });
    expect(notesOnly.total).toBe(2);
    expect(notesOnly.hits.every((h) => h.type === 'note')).toBe(true);
  });

  it('drops a removed entity from results', () => {
    svc.upsert({ type: 'memory', entityId: 'm1', title: 'secret sauce', body: '' });
    expect(svc.query('"secret"*', { limit: 10 }).total).toBe(1);
    svc.remove('memory', 'm1');
    expect(svc.query('"secret"*', { limit: 10 }).total).toBe(0);
  });

  it('honours the result limit while keeping the full total', () => {
    for (let i = 0; i < 5; i++) {
      svc.upsert({ type: 'task', entityId: `t${i}`, title: 'paginated', body: '' });
    }
    const { hits, total } = svc.query('"paginated"*', { limit: 2 });
    expect(hits).toHaveLength(2);
    expect(total).toBe(5);
  });

  it('clears the whole index', () => {
    svc.upsertMany([
      { type: 'task', entityId: 't1', title: 'a', body: '' },
      { type: 'note', entityId: 'n1', title: 'b', body: '' },
    ]);
    expect(svc.count()).toBe(2);
    svc.clear();
    expect(svc.count()).toBe(0);
  });
});
