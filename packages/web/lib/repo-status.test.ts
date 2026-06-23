import { describe, expect, it } from 'vitest';
import type { Repo, Status, Task } from '@midnite/shared';

import { summarizeByRepo } from './repo-status';

let seq = 0;
function task(repo: string | null, status: Status, archived = false): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `task ${seq}`,
    kind: 'feature',
    status,
    priority: 1,
    repo: repo ?? undefined,
    createdAt: '2026-06-22T00:00:00.000Z',
    updatedAt: '2026-06-22T00:00:00.000Z',
    ...(archived ? { archivedAt: '2026-06-22T01:00:00.000Z' } : {}),
  } as Task;
}

const repo = (name: string): Repo => ({ id: name, name, path: `~/repos/${name}`, createdAt: '', updatedAt: '' });

describe('summarizeByRepo', () => {
  it('buckets running (wip+waiting), queued (todo), backlog and done per repo', () => {
    const rows = summarizeByRepo(
      [
        task('web', 'wip'),
        task('web', 'waiting'),
        task('web', 'todo'),
        task('web', 'done'),
        task('web', 'backlog'),
      ],
      [repo('web')],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ repo: 'web', running: 2, queued: 1, backlog: 1, done: 1, total: 5 });
  });

  it('shows every registered repo, even idle ones at zero', () => {
    const rows = summarizeByRepo([task('web', 'todo')], [repo('web'), repo('api')]);
    const api = rows.find((r) => r.repo === 'api');
    expect(api).toMatchObject({ running: 0, queued: 0, total: 0 });
  });

  it('adds an Unassigned bucket only when some task has no repo, pinned last', () => {
    const none = summarizeByRepo([task('web', 'todo')], [repo('web')]);
    expect(none.some((r) => r.repo === null)).toBe(false);

    const rows = summarizeByRepo([task('web', 'todo'), task(null, 'wip')], [repo('web')]);
    expect(rows.at(-1)).toMatchObject({ repo: null, label: 'Unassigned', running: 1 });
  });

  it('excludes archived and abandoned tasks', () => {
    const rows = summarizeByRepo(
      [task('web', 'done', true), task('web', 'abandoned'), task('web', 'todo')],
      [repo('web')],
    );
    expect(rows[0]).toMatchObject({ queued: 1, done: 0, total: 1 });
  });

  it('sorts by activity: most running, then most queued', () => {
    const rows = summarizeByRepo(
      [
        task('quiet', 'todo'),
        task('busy', 'wip'),
        task('busy', 'wip'),
        task('queuey', 'todo'),
        task('queuey', 'todo'),
        task('queuey', 'todo'),
      ],
      [repo('quiet'), repo('busy'), repo('queuey')],
    );
    expect(rows.map((r) => r.repo)).toEqual(['busy', 'queuey', 'quiet']);
  });
});
