import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test';
import { PrReviewCommentsRepository, toDraft } from './pr-review-comments.repository';
import { prReviewComments, type PrReviewCommentInsert } from '../db/schema';

function seed(h: TestDbHandle, over: Partial<PrReviewCommentInsert> = {}): PrReviewCommentInsert {
  const row: PrReviewCommentInsert = {
    id: `c-${Math.round(Math.random() * 1e9)}`,
    taskId: 't1',
    path: 'a.ts',
    line: 3,
    side: 'RIGHT',
    body: 'nit',
    author: 'u1',
    state: 'draft',
    githubCommentId: null,
    createdAt: '2026-07-05T00:00:00Z',
    ...over,
  };
  h.db.insert(prReviewComments).values(row).run();
  return row;
}

describe('PrReviewCommentsRepository', () => {
  let h: TestDbHandle;
  let repo: PrReviewCommentsRepository;
  beforeEach(() => {
    h = createTestDb();
    repo = new PrReviewCommentsRepository(h.db);
  });
  afterEach(() => h.close());

  it('lists only a given author\'s draft rows for the task, oldest-first', () => {
    seed(h, { id: 'a', author: 'u1', createdAt: '2026-07-05T00:00:02Z' });
    seed(h, { id: 'b', author: 'u1', createdAt: '2026-07-05T00:00:01Z' });
    seed(h, { id: 'c', author: 'u2' }); // other author
    seed(h, { id: 'd', author: 'u1', state: 'submitted' }); // not a draft
    const drafts = repo.listDrafts('t1', 'u1');
    expect(drafts.map((d) => d.id)).toEqual(['b', 'a']);
  });

  it('inserts, updates the body, and removes', () => {
    const row = repo.insert({
      id: 'x1',
      taskId: 't1',
      path: 'a.ts',
      line: 5,
      side: 'LEFT',
      body: 'first',
      author: 'u1',
      state: 'draft',
      createdAt: '2026-07-05T00:00:00Z',
    });
    expect(row.id).toBe('x1');
    expect(repo.updateBody('x1', 'edited')?.body).toBe('edited');
    expect(repo.remove('x1')).toBe(true);
    expect(repo.get('x1')).toBeUndefined();
  });

  it('markSubmitted flips a set of drafts (and no-ops on empty)', () => {
    seed(h, { id: 'a', author: 'u1' });
    seed(h, { id: 'b', author: 'u1' });
    repo.markSubmitted([]); // no-op
    expect(repo.listDrafts('t1', 'u1')).toHaveLength(2);
    repo.markSubmitted(['a', 'b']);
    expect(repo.listDrafts('t1', 'u1')).toHaveLength(0);
  });

  it('toDraft narrows the free-text side/state columns', () => {
    const d = toDraft(seed(h, { id: 'z', side: 'LEFT', state: 'submitted' }) as never);
    expect(d.side).toBe('LEFT');
    expect(d.state).toBe('submitted');
  });
});
