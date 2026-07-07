import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ANSWER_EVENT_KIND } from '@midnite/shared';
import { createTestDb, type TestDbHandle } from '../test/db';
import { seedLargeDataset } from '../test/seed-large';
import { roadmapMilestones } from '../db/schema';
import { TasksRepository } from './tasks.repository';

/**
 * Phase 57 C — the lean board DTO + offset pagination + activity feed.
 * `summariseMany` must keep exactly what a board card renders and shed the rest
 * (no event thread; first image only; ≤6 links; derived `answered`), and
 * `listTaskPage` must page + count over the same ordering as `listTasks`.
 */
describe('TasksRepository — summaries + pagination (Phase 57 C)', () => {
  let handle: TestDbHandle;
  let repo: TasksRepository;
  const now = '2026-07-06T00:00:00.000Z';

  beforeEach(() => {
    handle = createTestDb();
    repo = new TasksRepository(handle.db);
  });
  afterEach(() => handle.close());

  it('sheds the event thread but keeps the card fields', () => {
    repo.insertTask({ id: 't1', title: 'Q', kind: 'question', status: 'done', priority: 2, tags: JSON.stringify(['x']), createdAt: now, updatedAt: now });
    // Two events incl. an answer → drives `answered`, but neither is carried.
    repo.insertEvent({ id: 'e1', taskId: 't1', at: now, kind: 'created' });
    repo.insertEvent({ id: 'e2', taskId: 't1', at: now, kind: ANSWER_EVENT_KIND });
    // A non-image + an image attachment → only the image survives.
    repo.insertAttachment({ id: 'a1', taskId: 't1', path: 'notes.txt', mime: 'text/plain', size: 10, createdAt: now });
    repo.insertAttachment({ id: 'a2', taskId: 't1', path: 'shot.png', mime: 'image/png', size: 20, createdAt: now });

    const [summary] = repo.summariseMany(repo.listTasks());
    expect(summary).toBeDefined();
    // No event thread on the wire.
    expect(summary as unknown as { events?: unknown }).not.toHaveProperty('events');
    expect(summary!.answered).toBe(true); // question + answer event, precomputed
    expect(summary!.tags).toEqual(['x']);
    expect(summary!.priority).toBe(2);
    // First image only.
    expect(summary!.attachments).toHaveLength(1);
    expect(summary!.attachments?.[0]?.mime).toBe('image/png');
  });

  it('joins the assigned milestone name onto the summary (Phase 58 F)', () => {
    handle.db
      .insert(roadmapMilestones)
      .values({ id: 'ms-1', projectId: 'p1', name: 'Alpha', position: 0, createdAt: now, updatedAt: now })
      .run();
    repo.insertTask({ id: 'tm', title: 'assigned', status: 'todo', priority: 1, projectId: 'p1', milestoneId: 'ms-1', createdAt: now, updatedAt: now });
    repo.insertTask({ id: 'tn', title: 'unassigned', status: 'todo', priority: 1, createdAt: now, updatedAt: now });

    const byId = new Map(repo.summariseMany(repo.listTasks()).map((s) => [s.id, s]));
    expect(byId.get('tm')?.milestoneId).toBe('ms-1');
    expect(byId.get('tm')?.milestoneName).toBe('Alpha');
    expect(byId.get('tn')?.milestoneName).toBeUndefined();
  });

  it('caps links at six and keeps blocker ids', () => {
    repo.insertTask({ id: 'blk', title: 'blocker', status: 'todo', priority: 1, createdAt: now, updatedAt: now });
    repo.insertTask({ id: 't2', title: 'many links', status: 'todo', priority: 1, createdAt: now, updatedAt: now });
    for (let i = 0; i < 8; i++) {
      repo.insertLink({ id: `l${i}`, taskId: 't2', url: `https://example.com/${i}`, kind: 'other', createdAt: now });
    }
    repo.addDependency('t2', 'blk', now);

    const summary = repo.summariseMany(repo.listTasks()).find((s) => s.id === 't2');
    expect(summary!.links).toHaveLength(6); // capped
    expect(summary!.dependsOn).toEqual(['blk']); // blocker ids kept for the "blocked by N" chip
  });

  it('answered is false for a non-question with an answer-like event', () => {
    repo.insertTask({ id: 't3', title: 'not a question', kind: 'feature', status: 'todo', priority: 1, createdAt: now, updatedAt: now });
    repo.insertEvent({ id: 'e3', taskId: 't3', at: now, kind: ANSWER_EVENT_KIND });
    const [summary] = repo.summariseMany(repo.listTasks());
    expect(summary!.answered).toBe(false);
  });

  it('listTaskPage returns everything (no page/limit) with total, same order as listTasks', () => {
    seedLargeDataset(handle.db, { tasks: 25, workflows: 0, seed: 3 });
    const { rows, total } = repo.listTaskPage();
    expect(total).toBe(25);
    expect(rows.length).toBe(25);
    expect(rows.map((r) => r.id)).toEqual(repo.listTasks().map((r) => r.id));
  });

  it('listTaskPage applies limit/offset while total stays the full count', () => {
    seedLargeDataset(handle.db, { tasks: 25, workflows: 0, seed: 3 });
    const all = repo.listTasks();
    const p1 = repo.listTaskPage(undefined, undefined, undefined, { page: 1, limit: 10 });
    const p2 = repo.listTaskPage(undefined, undefined, undefined, { page: 2, limit: 10 });
    const p3 = repo.listTaskPage(undefined, undefined, undefined, { page: 3, limit: 10 });
    expect(p1.total).toBe(25);
    expect(p1.rows.length).toBe(10);
    expect(p3.rows.length).toBe(5); // 25 = 10 + 10 + 5
    // Pages tile the full ordered set with no overlap or gap.
    expect([...p1.rows, ...p2.rows, ...p3.rows].map((r) => r.id)).toEqual(all.map((r) => r.id));
  });

  it('recentActivity returns the newest events across tasks, newest first', () => {
    repo.insertTask({ id: 't4', title: 'A', status: 'todo', priority: 1, createdAt: now, updatedAt: now });
    repo.insertTask({ id: 't5', title: 'B', status: 'todo', priority: 1, createdAt: now, updatedAt: now });
    repo.insertEvent({ id: 'ev1', taskId: 't4', at: '2026-07-06T00:00:01.000Z', kind: 'created' });
    repo.insertEvent({ id: 'ev2', taskId: 't5', at: '2026-07-06T00:00:03.000Z', kind: 'moved' });
    repo.insertEvent({ id: 'ev3', taskId: 't4', at: '2026-07-06T00:00:02.000Z', kind: 'commented' });

    const feed = repo.recentActivity(undefined, 2);
    expect(feed).toHaveLength(2); // limit honoured
    expect(feed.map((e) => e.kind)).toEqual(['moved', 'commented']); // newest first
    expect(feed[0]!.title).toBe('B'); // joined the task title
  });
});
