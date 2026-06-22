import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MidniteConfig } from '@midnite/shared';
import { DbFactory } from './db.module';
import { tasks } from './schema';

/**
 * Regression: migrations must be applied as part of *building* the DB handle,
 * not in a separate `DbModule.onModuleInit`. Nest instantiates the whole
 * provider graph before firing any lifecycle hook, and a feature module's
 * `onModuleInit` (e.g. CouncilRunnerService's stale-run sweep) can run before
 * DbModule's — so on a fresh DB those queries hit tables that wouldn't exist yet
 * unless migration is tied to handle construction. On a persisted dev/prod DB
 * the bug hides (tables linger from a prior run); on a fresh DB (every e2e run)
 * it crashes the boot with `no such table: council_runs`.
 */
describe('DbFactory', () => {
  let dir: string;

  function factoryFor(dbPath: string): DbFactory {
    // Only `gateway.dbPath` is read by the factory; cast the rest away.
    return new DbFactory({ gateway: { dbPath } } as unknown as MidniteConfig);
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'midnite-dbfactory-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('applies migrations on a fresh DB the moment the handle is built', () => {
    const factory = factoryFor(join(dir, 'fresh.db'));

    // Touching the handle is all that should be needed — no Nest lifecycle hook.
    const names = factory.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => (r as { name: string }).name);

    // `council_runs` is the exact table the boot crash named; assert it plus a
    // representative spread so the whole migration chain is proven to have run.
    expect(names).toEqual(
      expect.arrayContaining(['tasks', 'projects', 'memories', 'council_runs']),
    );
  });

  it('shares one connection between the Drizzle and raw handles', () => {
    const factory = factoryFor(join(dir, 'shared.db'));
    // A write through the raw handle is visible via the Drizzle handle — proof
    // they wrap the same connection (memoized, opened once).
    factory.sqlite
      .prepare(
        "INSERT INTO tasks (id, title, kind, status, created_at, updated_at, priority, retry_count) VALUES ('t1', 't1', 'unknown', 'todo', '2026-06-22T00:00:00.000Z', '2026-06-22T00:00:00.000Z', 1, 0)",
      )
      .run();
    expect(factory.db.select().from(tasks).all()).toHaveLength(1);
  });
});
