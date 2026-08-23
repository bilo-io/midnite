import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeAll, describe, expect, it } from 'vitest';

import type { GithubProjectStatusMapping } from '@midnite/shared';

import * as schema from '../db/schema';
import { GithubProjectItemsRepository, type ProjectItemWrite } from './github-project-items.repository';

// Real `:memory:` SQLite: the contract here is largely SQL — two unique indexes and a
// child table with no foreign key to clean it up — so a fake would prove nothing.
//
// One migrated DB for the file (not per test): replaying ~99 migrations per test is what
// made a sibling spec tip over its timeout under full-suite load.

let db: ReturnType<typeof drizzle>;
let repo: GithubProjectItemsRepository;

beforeAll(() => {
  const sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  repo = new GithubProjectItemsRepository(db as never);
});

/** Clear both tables between tests without paying for a re-migration. */
function reset() {
  db.delete(schema.githubProjectStatusMap).run();
  db.delete(schema.githubProjectItems).run();
}

const MAPPINGS: GithubProjectStatusMapping[] = [
  { status: 'todo', optionId: 'opt-todo', optionName: 'Todo' },
  { status: 'wip', optionId: 'opt-wip', optionName: 'In Progress' },
];

function write(over: Partial<ProjectItemWrite> = {}): ProjectItemWrite {
  return {
    taskId: 'task-1',
    teamId: 'team-1',
    projectNodeId: 'PVT_1',
    itemNodeId: 'PVTI_1',
    projectTitle: 'Roadmap',
    projectUrl: 'https://github.com/orgs/acme/projects/4',
    statusFieldNodeId: 'PVTSSF_1',
    statusOptionName: 'Todo',
    itemUrl: 'https://github.com/orgs/acme/projects/4?pane=item&itemId=1',
    mappings: MAPPINGS,
    ...over,
  };
}

describe('GithubProjectItemsRepository', () => {
  it('round-trips a link with its mapping', () => {
    reset();
    const created = repo.insert(write());
    expect(created).toMatchObject({
      taskId: 'task-1',
      projectTitle: 'Roadmap',
      statusOptionName: 'Todo',
    });
    // The mapping is only ever meaningful with its link, so every read joins it.
    expect(created.mappings).toHaveLength(2);
    expect(repo.getByTask('task-1')?.mappings).toEqual(MAPPINGS);
  });

  it('returns undefined for an unlinked task', () => {
    reset();
    expect(repo.getByTask('nope')).toBeUndefined();
  });

  it('reads several tasks at once without N+1 mapping queries', () => {
    reset();
    repo.insert(write({ taskId: 'task-1', itemNodeId: 'PVTI_1' }));
    repo.insert(write({ taskId: 'task-2', itemNodeId: 'PVTI_2' }));

    const items = repo.listByTasks(['task-1', 'task-2', 'task-3']);
    expect(items.map((i) => i.taskId).sort()).toEqual(['task-1', 'task-2']);
    expect(items.every((i) => i.mappings.length === 2)).toBe(true);
  });

  it('returns nothing for an empty id list rather than every row', () => {
    reset();
    repo.insert(write());
    expect(repo.listByTasks([])).toEqual([]);
  });

  it('finds an existing adoption by its GitHub node ids', () => {
    reset();
    repo.insert(write());
    expect(repo.findByNode('PVT_1', 'PVTI_1')?.taskId).toBe('task-1');
    expect(repo.findByNode('PVT_1', 'PVTI_other')).toBeUndefined();
  });

  it('refuses a second link for one task', () => {
    // One link per task — two would make "which column is this task in?" unanswerable.
    reset();
    repo.insert(write());
    expect(() => repo.insert(write({ itemNodeId: 'PVTI_2' }))).toThrow(/UNIQUE/i);
  });

  it('refuses two tasks adopting the same GitHub item', () => {
    reset();
    repo.insert(write());
    expect(() => repo.insert(write({ taskId: 'task-2' }))).toThrow(/UNIQUE/i);
  });

  it('replaces a mapping wholesale, including clearing it', () => {
    reset();
    const created = repo.insert(write());

    repo.replaceMappings(created.id, [
      { status: 'done', optionId: 'opt-done', optionName: 'Done' },
    ]);
    expect(repo.getByTask('task-1')?.mappings).toEqual([
      { status: 'done', optionId: 'opt-done', optionName: 'Done' },
    ]);

    // An empty array is a legitimate "clear it" — every push becomes a no-op.
    repo.replaceMappings(created.id, []);
    expect(repo.getByTask('task-1')?.mappings).toEqual([]);
  });

  it('records a successful read-back and clears a previous error', () => {
    reset();
    const created = repo.insert(write());
    repo.markSynced(created.id, { lastError: 'boom' });
    expect(repo.getByTask('task-1')?.lastError).toBe('boom');

    repo.markSynced(created.id, { statusOptionName: 'In Progress', lastError: null });
    const after = repo.getByTask('task-1')!;
    expect(after.statusOptionName).toBe('In Progress');
    expect(after.lastError).toBeUndefined();
    expect(after.lastSyncedAt).toBeTruthy();
  });

  it('leaves untouched fields alone on a partial sync patch', () => {
    // `undefined` means "don't touch"; `null` means "clear". Conflating them would wipe
    // the last-known column every time a read failed.
    reset();
    const created = repo.insert(write());
    repo.markSynced(created.id, { lastError: 'network down' });
    expect(repo.getByTask('task-1')?.statusOptionName).toBe('Todo');
  });

  it('removes the link and its mapping rows together', () => {
    reset();
    const created = repo.insert(write());
    expect(repo.remove('task-1')).toBe(true);
    expect(repo.getByTask('task-1')).toBeUndefined();
    // No FKs across logical domains here, so orphans are a real possibility — a later
    // link reusing the id would otherwise inherit a stale mapping.
    const orphans = db
      .select()
      .from(schema.githubProjectStatusMap)
      .where(eq(schema.githubProjectStatusMap.itemId, created.id))
      .all();
    expect(orphans).toEqual([]);
  });

  it('reports false when there was nothing to unlink', () => {
    reset();
    expect(repo.remove('never-linked')).toBe(false);
  });

  it('does not stamp lastSyncedAt when the link recorded a read failure', () => {
    // "No column set… Last read just now" is a lie; only a successful read is a sync.
    reset();
    const created = repo.insert(write({ statusOptionName: undefined, lastError: 'boom' }));
    expect(created.lastError).toBe('boom');
    expect(created.lastSyncedAt).toBeUndefined();
  });

  it('keeps the existing mapping when a replace is rejected', () => {
    // Delete-then-insert without a transaction meant a duplicate status tripped the
    // unique index AFTER the delete had committed — a 500 that also silently wiped the
    // mapping, turning every push into a no-op.
    reset();
    const created = repo.insert(write());
    expect(() =>
      repo.replaceMappings(created.id, [
        { status: 'done', optionId: 'a', optionName: 'Done' },
        { status: 'done', optionId: 'b', optionName: 'Shipped' },
      ]),
    ).toThrow();
    expect(repo.getByTask('task-1')?.mappings).toEqual(MAPPINGS);
  });

  it('lets the same GitHub item be re-adopted after an unlink', () => {
    reset();
    repo.insert(write());
    repo.remove('task-1');
    expect(() => repo.insert(write({ taskId: 'task-2' }))).not.toThrow();
  });
});
