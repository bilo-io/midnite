import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test/db';
import { RuntimeMetaRepository } from './runtime-meta.repository';
import { RuntimeMetaService } from './runtime-meta.service';

describe('RuntimeMetaService (Phase 54 E)', () => {
  let handle: TestDbHandle;
  let repo: RuntimeMetaRepository;

  beforeEach(() => {
    handle = createTestDb();
    repo = new RuntimeMetaRepository(handle.db);
  });
  afterEach(() => handle.close());

  it('first boot: no prior marker, stamps this run as not-yet-clean', () => {
    const svc = new RuntimeMetaService(repo);
    svc.onModuleInit();
    expect(svc.previousShutdownClean()).toBeNull();
    const row = repo.read();
    expect(row?.clean).toBe(false);
    expect(row?.startedAt).toBeTruthy();
  });

  it('a graceful shutdown marks clean; the next boot reads it as the previous state', () => {
    // Run 1: boot then drain cleanly.
    const run1 = new RuntimeMetaService(repo);
    run1.onModuleInit();
    run1.markCleanShutdown();
    expect(repo.read()?.clean).toBe(true);

    // Run 2: boot sees run 1's clean shutdown, then re-stamps not-yet-clean.
    const run2 = new RuntimeMetaService(repo);
    run2.onModuleInit();
    expect(run2.previousShutdownClean()).toBe(true);
    expect(repo.read()?.clean).toBe(false); // this run hasn't drained yet
  });

  it('a crash (no markClean) leaves clean=false for the next boot to detect', () => {
    const run1 = new RuntimeMetaService(repo);
    run1.onModuleInit();
    // …process dies without markCleanShutdown()…

    const run2 = new RuntimeMetaService(repo);
    run2.onModuleInit();
    expect(run2.previousShutdownClean()).toBe(false);
  });
});
