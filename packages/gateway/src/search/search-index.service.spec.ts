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
    svc.upsert({ type: 'task', entityId: 't1', teamId: null, title: 'Fix OAuth login', body: 'token flow broken' });
    expect(svc.count()).toBe(1);

    const { hits, total } = svc.query('"oauth"*', { limit: 10 });
    expect(total).toBe(1);
    expect(hits[0]).toMatchObject({ type: 'task', entityId: 't1', title: 'Fix OAuth login' });
    expect(hits[0]!.snippet).toContain('<mark>');
    expect(hits[0]!.score).toBeGreaterThan(0);
  });

  it('upsert replaces the prior row rather than duplicating', () => {
    svc.upsert({ type: 'note', entityId: 'n1', teamId: null, title: 'old', body: 'alpha' });
    svc.upsert({ type: 'note', entityId: 'n1', teamId: null, title: 'new', body: 'beta' });
    expect(svc.count()).toBe(1);
    expect(svc.query('"alpha"*', { limit: 10 }).total).toBe(0);
    expect(svc.query('"beta"*', { limit: 10 }).hits[0]?.title).toBe('new');
  });

  it('ranks a title match above a body-only match', () => {
    svc.upsert({ type: 'task', entityId: 'body', teamId: null, title: 'unrelated', body: 'mentions deploy once' });
    svc.upsert({ type: 'task', entityId: 'title', teamId: null, title: 'Deploy pipeline', body: 'unrelated' });
    const hits = svc.query('"deploy"*', { limit: 10 }).hits;
    expect(hits.map((h) => h.entityId)).toEqual(['title', 'body']);
  });

  it('filters by type and reports counts per type', () => {
    svc.upsert({ type: 'task', entityId: 't1', teamId: null, title: 'shared term', body: '' });
    svc.upsert({ type: 'note', entityId: 'n1', teamId: null, title: 'shared term', body: '' });
    svc.upsert({ type: 'note', entityId: 'n2', teamId: null, title: 'shared term', body: '' });

    const all = svc.query('"shared"*', { limit: 10 });
    expect(all.total).toBe(3);
    expect(all.byType).toEqual({ task: 1, note: 2 });

    const notesOnly = svc.query('"shared"*', { type: 'note', limit: 10 });
    expect(notesOnly.total).toBe(2);
    expect(notesOnly.hits.every((h) => h.type === 'note')).toBe(true);
  });

  it('drops a removed entity from results', () => {
    svc.upsert({ type: 'memory', entityId: 'm1', teamId: null, title: 'secret sauce', body: '' });
    expect(svc.query('"secret"*', { limit: 10 }).total).toBe(1);
    svc.remove('memory', 'm1');
    expect(svc.query('"secret"*', { limit: 10 }).total).toBe(0);
  });

  it('honours the result limit while keeping the full total', () => {
    for (let i = 0; i < 5; i++) {
      svc.upsert({ type: 'task', entityId: `t${i}`, teamId: null, title: 'paginated', body: '' });
    }
    const { hits, total } = svc.query('"paginated"*', { limit: 2 });
    expect(hits).toHaveLength(2);
    expect(total).toBe(5);
  });

  it('clears the whole index', () => {
    svc.upsertMany([
      { type: 'task', entityId: 't1', teamId: null, title: 'a', body: '' },
      { type: 'note', entityId: 'n1', teamId: null, title: 'b', body: '' },
    ]);
    expect(svc.count()).toBe(2);
    svc.clear();
    expect(svc.count()).toBe(0);
  });

  it('scopes results to a team — team-A task absent from team-B query', () => {
    svc.upsert({ type: 'task', entityId: 'private-a', teamId: 'team-a', title: 'team alpha task', body: '' });
    svc.upsert({ type: 'task', entityId: 'private-b', teamId: 'team-b', title: 'team beta task', body: '' });
    svc.upsert({ type: 'task', entityId: 'shared', teamId: null, title: 'legacy shared task', body: '' });

    // team-a sees its own + unscoped
    const forA = svc.query('"task"*', { limit: 10, teamId: 'team-a' });
    const idsA = forA.hits.map((h) => h.entityId).sort();
    expect(idsA).toEqual(['private-a', 'shared'].sort());

    // team-b sees its own + unscoped
    const forB = svc.query('"task"*', { limit: 10, teamId: 'team-b' });
    const idsB = forB.hits.map((h) => h.entityId).sort();
    expect(idsB).toEqual(['private-b', 'shared'].sort());

    // no team (teamId = null → personal-only) sees only unscoped
    const personal = svc.query('"task"*', { limit: 10, teamId: null });
    expect(personal.hits.map((h) => h.entityId)).toEqual(['shared']);

    // legacy unauthenticated path (teamId = undefined) sees everything
    const all = svc.query('"task"*', { limit: 10 });
    expect(all.total).toBe(3);
  });
});
