import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test/db';
import { SearchIndexService } from './search-index.service';

describe('SearchIndexService', () => {
  let handle: TestDbHandle;
  let index: SearchIndexService;

  beforeEach(() => {
    handle = createTestDb();
    index = new SearchIndexService(handle.sqlite);
  });

  afterEach(() => handle.close());

  function seed(): void {
    index.upsert('task', 't1', 'Add authentication flow', 'wire up the login and signup endpoints');
    index.upsert('project', 'p1', 'Billing service', 'handle invoices and authentication tokens');
    index.upsert('note', 'n1', 'rotate secrets', 'remember to rotate the auth secret weekly');
  }

  it('migrates the FTS5 table so the index starts empty', () => {
    expect(index.count()).toBe(0);
    expect(index.query('anything')).toEqual([]);
  });

  it('matches across entity types and prefix-matches the last token', () => {
    seed();
    const hits = index.query('auth');
    const ids = hits.map((h) => `${h.type}:${h.id}`).sort();
    // 'auth' prefix hits 'authentication' (task, project) and 'auth' (note).
    expect(ids).toEqual(['note:n1', 'project:p1', 'task:t1']);
  });

  it('ranks best-first with a positive (negated-bm25) score', () => {
    seed();
    const hits = index.query('authentication');
    expect(hits.length).toBeGreaterThan(0);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1]!.score).toBeGreaterThanOrEqual(hits[i]!.score);
    }
  });

  it('ranks a title match above a body-only match (title boost)', () => {
    index.upsert('task', 'body', 'unrelated heading', 'the kestrel nests on cliffs');
    index.upsert('project', 'title', 'kestrel', 'a falconry program');
    const hits = index.query('kestrel');
    expect(hits.map((h) => h.id)).toEqual(['title', 'body']);
  });

  it('emphasises the match in title and snippet', () => {
    seed();
    const [hit] = index.query('billing');
    expect(hit?.type).toBe('project');
    expect(hit?.title).toContain('<mark>Billing</mark>');
  });

  it('falls back to the title when the body has no snippet', () => {
    index.upsert('task', 't9', 'standalone label', '');
    const [hit] = index.query('standalone');
    expect(hit?.snippet).toBe('standalone label');
  });

  it('filters by type', () => {
    seed();
    const hits = index.query('auth', { type: 'task' });
    expect(hits).toHaveLength(1);
    expect(hits[0]!.type).toBe('task');
  });

  it('honours the limit', () => {
    seed();
    expect(index.query('auth', { limit: 1 })).toHaveLength(1);
  });

  it('upsert replaces the prior row rather than duplicating it', () => {
    index.upsert('task', 't1', 'first title', 'first body');
    index.upsert('task', 't1', 'second title', 'second body about kestrels');
    expect(index.count()).toBe(1);
    expect(index.query('kestrels')).toHaveLength(1);
    expect(index.query('first')).toEqual([]);
  });

  it('remove drops a row and is idempotent', () => {
    seed();
    index.remove('task', 't1');
    expect(index.query('auth', { type: 'task' })).toEqual([]);
    expect(() => index.remove('task', 't1')).not.toThrow();
  });

  it('returns no results for empty or punctuation-only queries', () => {
    seed();
    expect(index.query('')).toEqual([]);
    expect(index.query('   ')).toEqual([]);
    expect(index.query('!!!')).toEqual([]);
  });

  it('treats bare FTS keywords as literal terms, not operators', () => {
    index.upsert('note', 'n2', 'and then', 'a note about and or not near operators');
    expect(() => index.query('and or not')).not.toThrow();
  });

  it('clear empties the whole index; indexAll bulk-loads it', () => {
    seed();
    index.clear();
    expect(index.count()).toBe(0);
    index.indexAll([
      { type: 'memory', id: 'm1', title: 'deploy runbook', body: 'how to ship a release' },
      { type: 'workflow', id: 'w1', title: 'nightly sync', body: 'pull and rebuild' },
    ]);
    expect(index.count()).toBe(2);
    expect(index.query('runbook').map((h) => h.id)).toEqual(['m1']);
  });
});
