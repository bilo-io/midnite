import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { projectRepos, projects as projectsTable, repos as reposTable } from '../db/schema';
import { createTestDb, type TestDbHandle } from '../test/db';
import { ProjectsRepository } from './projects.repository';

// Phase 84 Theme C — the `project_repos` edges against a real SQLite: the
// one-primary invariant (which decides a project's effective working directory),
// the batched hydration, and the cascade when a repo leaves the registry.

describe('project ↔ repo edges', () => {
  let handle: TestDbHandle;
  let repo: ProjectsRepository;
  let seq = 0;

  const now = () => new Date(2026, 0, 1, 0, 0, ++seq).toISOString();

  function addRepo(name: string, path: string): string {
    const id = `repo-${name}`;
    handle.db
      .insert(reposTable)
      .values({ id, name, path, createdAt: now(), updatedAt: now() })
      .run();
    return id;
  }

  function addProject(id: string, workDir?: string): string {
    repo.insertProject({
      id,
      name: id,
      tag: 'tst',
      color: '#7c3aed',
      workDir: workDir ?? null,
      createdAt: now(),
      updatedAt: now(),
    });
    return id;
  }

  // One migrated database for the whole file, truncated between tests. `createTestDb`
  // replays every migration, so doing it per-test made this file the slowest in the
  // gateway suite and pushed it past the 5s timeout under full-suite load (reported by
  // a parallel session). The tests only need an empty set of these three tables.
  beforeAll(() => {
    handle = createTestDb();
    repo = new ProjectsRepository(handle.db);
  });
  afterAll(() => handle.close());

  beforeEach(() => {
    handle.db.delete(projectRepos).run();
    handle.db.delete(projectsTable).run();
    handle.db.delete(reposTable).run();
    seq = 0;
  });

  it('makes the first attached repo primary without being asked', () => {
    addProject('p1');
    const gateway = addRepo('gateway', '~/Dev/midnite/packages/gateway');
    repo.attachRepo('p1', gateway, false, now());

    const [only] = repo.listReposForProject('p1');
    expect(only).toMatchObject({ repoId: gateway, name: 'gateway', isPrimary: true });
  });

  it('keeps exactly one primary when a later attach claims it', () => {
    addProject('p1');
    const a = addRepo('a', '~/Dev/a');
    const b = addRepo('b', '~/Dev/b');
    repo.attachRepo('p1', a, false, now());
    repo.attachRepo('p1', b, true, now());

    const list = repo.listReposForProject('p1');
    expect(list.filter((r) => r.isPrimary)).toHaveLength(1);
    expect(list.find((r) => r.isPrimary)?.repoId).toBe(b);
  });

  it('orders primary first, then oldest attachment', () => {
    addProject('p1');
    const a = addRepo('a', '~/Dev/a');
    const b = addRepo('b', '~/Dev/b');
    const c = addRepo('c', '~/Dev/c');
    repo.attachRepo('p1', a, false, now());
    repo.attachRepo('p1', b, false, now());
    repo.attachRepo('p1', c, true, now());

    expect(repo.listReposForProject('p1').map((r) => r.repoId)).toEqual([c, a, b]);
  });

  it('promotes the oldest survivor when the primary is detached', () => {
    addProject('p1');
    const a = addRepo('a', '~/Dev/a');
    const b = addRepo('b', '~/Dev/b');
    repo.attachRepo('p1', a, true, now());
    repo.attachRepo('p1', b, false, now());

    repo.detachRepo('p1', a);

    const list = repo.listReposForProject('p1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ repoId: b, isPrimary: true });
  });

  it('detaching a non-primary leaves the primary alone', () => {
    addProject('p1');
    const a = addRepo('a', '~/Dev/a');
    const b = addRepo('b', '~/Dev/b');
    repo.attachRepo('p1', a, true, now());
    repo.attachRepo('p1', b, false, now());

    repo.detachRepo('p1', b);

    expect(repo.listReposForProject('p1')).toEqual([
      expect.objectContaining({ repoId: a, isPrimary: true }),
    ]);
  });

  it('shares a repo across projects without the primary flags interfering', () => {
    addProject('p1');
    addProject('p2');
    const shared = addRepo('shared', '~/Dev/shared');
    const other = addRepo('other', '~/Dev/other');
    repo.attachRepo('p1', shared, true, now());
    repo.attachRepo('p2', other, true, now());
    repo.attachRepo('p2', shared, false, now());

    expect(repo.listReposForProject('p1').find((r) => r.isPrimary)?.repoId).toBe(shared);
    expect(repo.listReposForProject('p2').find((r) => r.isPrimary)?.repoId).toBe(other);
  });

  it('batches many projects into one map, omitting those with no edges', () => {
    addProject('p1');
    addProject('p2');
    addProject('p3');
    repo.attachRepo('p1', addRepo('a', '~/Dev/a'), true, now());
    repo.attachRepo('p2', addRepo('b', '~/Dev/b'), true, now());

    const map = repo.reposForProjectIds(['p1', 'p2', 'p3']);
    expect([...map.keys()].sort()).toEqual(['p1', 'p2']);
    expect(map.get('p1')?.[0]?.name).toBe('a');
  });

  describe('effective working directory', () => {
    it('is the primary repo path once repos are attached', () => {
      addProject('p1', '~/Dev/legacy');
      repo.attachRepo('p1', addRepo('a', '~/Dev/a'), true, now());
      expect(repo.effectiveWorkDirFor('p1')).toBe('~/Dev/a');
    });

    it('falls back to the stored workDir when nothing is attached', () => {
      addProject('p1', '~/Dev/legacy');
      expect(repo.effectiveWorkDirFor('p1')).toBe('~/Dev/legacy');
    });

    it('falls back again once the last repo is detached', () => {
      addProject('p1', '~/Dev/legacy');
      const a = addRepo('a', '~/Dev/a');
      repo.attachRepo('p1', a, true, now());
      repo.detachRepo('p1', a);
      expect(repo.effectiveWorkDirFor('p1')).toBe('~/Dev/legacy');
    });

    it('moves when the primary is reassigned', () => {
      addProject('p1');
      const a = addRepo('a', '~/Dev/a');
      const b = addRepo('b', '~/Dev/b');
      repo.attachRepo('p1', a, true, now());
      repo.attachRepo('p1', b, false, now());

      repo.setPrimaryRepo('p1', b);

      expect(repo.effectiveWorkDirFor('p1')).toBe('~/Dev/b');
    });
  });

  it('clears every edge for a repo leaving the registry, promoting successors', () => {
    addProject('p1');
    addProject('p2');
    const doomed = addRepo('doomed', '~/Dev/doomed');
    const survivor = addRepo('survivor', '~/Dev/survivor');
    repo.attachRepo('p1', doomed, true, now());
    repo.attachRepo('p1', survivor, false, now());
    repo.attachRepo('p2', doomed, true, now());

    repo.clearEdgesForRepo(doomed);

    // p1 keeps its other repo, promoted; p2 is left with none and falls back.
    expect(repo.listReposForProject('p1')).toEqual([
      expect.objectContaining({ repoId: survivor, isPrimary: true }),
    ]);
    expect(repo.listReposForProject('p2')).toEqual([]);
  });

  it('drops a deleted project’s edges without touching the repos', () => {
    addProject('p1');
    const a = addRepo('a', '~/Dev/a');
    repo.attachRepo('p1', a, true, now());

    repo.deleteProject('p1');

    expect(repo.listReposForProject('p1')).toEqual([]);
    expect(repo.listAllRepos().map((r) => r.id)).toContain(a);
  });

  it('lists only projects with no edges as backfill candidates', () => {
    addProject('linked', '~/Dev/a');
    addProject('unlinked', '~/Dev/b');
    repo.attachRepo('linked', addRepo('a', '~/Dev/a'), true, now());

    expect(repo.listProjectsWithoutRepos().map((p) => p.id)).toEqual(['unlinked']);
  });
});

// The backfill's matching runs in TypeScript rather than SQL precisely so it can
// realpath — these are the cases a string compare gets wrong (Phase 84 D).
describe('backfill path matching against a real filesystem', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'midnite-backfill-'));
    mkdirSync(join(dir, 'checkout'), { recursive: true });
    symlinkSync(join(dir, 'checkout'), join(dir, 'linked'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('matches a symlinked workDir to the real checkout path', async () => {
    const { canonicalKeyForTest } = await import('./projects.service');
    expect(canonicalKeyForTest(join(dir, 'linked'))).toBe(
      canonicalKeyForTest(join(dir, 'checkout')),
    );
  });

  it('matches a trailing-slash workDir', async () => {
    const { canonicalKeyForTest } = await import('./projects.service');
    expect(canonicalKeyForTest(`${join(dir, 'checkout')}/`)).toBe(
      canonicalKeyForTest(join(dir, 'checkout')),
    );
  });

  it('does not match a genuinely different directory', async () => {
    const { canonicalKeyForTest } = await import('./projects.service');
    expect(canonicalKeyForTest(join(dir, 'checkout'))).not.toBe(canonicalKeyForTest(dir));
  });
});
