import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test/db';
import { unpackArchive } from './lib/archive';
import { PortabilityService } from './portability.service';

// Minimal fakes — only the read method the orchestrator calls per domain.
function fakeServices() {
  return {
    tasks: { listTasks: () => [{ id: 't1' }, { id: 't2' }] },
    projects: { listProjects: () => [{ id: 'p1' }] },
    repos: { list: () => [{ name: 'api' }] },
    memories: { listMemories: () => [] },
    notes: { listNotes: () => [{ id: 'n1' }] },
    routines: { listRoutines: () => [] },
    media: { listMedia: () => [] },
    councils: { listCouncils: () => [{ id: 'c1' }] },
    approvals: { list: () => [{ id: 'r1' }] },
    workflows: { listSummaries: () => [{ id: 'w1' }], getWorkflow: (id: string) => ({ id, nodes: [] }) },
  };
}

// A crypto stub: `decrypt` echoes stored plaintext, `encrypt` prefixes it, and
// `isEnabled` is togglable so tests can exercise the "no instance key" path.
function fakeCrypto(enabled = true) {
  return {
    isEnabled: () => enabled,
    decrypt: (v: string) => v,
    encrypt: (v: string) => `v1:${v}`,
  };
}

function build(db: TestDbHandle['db'], crypto = fakeCrypto()) {
  const s = fakeServices();
  const svc = new PortabilityService(
    db,
    crypto as never,
    s.tasks as never, s.projects as never, s.repos as never, s.memories as never,
    s.notes as never, s.routines as never, s.media as never, s.councils as never,
    s.approvals as never, s.workflows as never,
  );
  return { svc, s };
}

describe('PortabilityService.export (Phase 49 B)', () => {
  let handle: TestDbHandle;
  beforeEach(() => (handle = createTestDb()));
  afterEach(() => handle.close());

  it('produces a secret-free archive over all work domains, stamping the manifest', () => {
    const { svc } = build(handle.db);
    const { summary: manifest, archive } = svc.export({ includeSecrets: false });

    expect(manifest.secretsMode).toBe('excluded');
    // Clamped nonnegative (the test DB isn't schema-meta-stamped → -1 → 0).
    expect(manifest.schemaVersion).toBeGreaterThanOrEqual(0);
    // Per-domain counts summary (Phase 49 D) — matches the payload records.
    expect(manifest.counts.tasks).toBe(2);
    expect(manifest.counts.workflows).toBe(1);
    expect(manifest.counts.memories).toBe(0);
    expect(manifest.domains).toEqual([
      'tasks', 'projects', 'repos', 'memories', 'notes',
      'routines', 'media', 'councils', 'approvalRules', 'workflows',
      // Theme G — auth + integration config always ride along (secret-free here).
      'users', 'teams', 'llmSettings', 'webhooks', 'workflowCredentials', 'llmProviders',
    ]);

    const { domains } = unpackArchive(archive);
    const tasks = domains.find((d) => d.domain === 'tasks')!;
    expect(tasks.count).toBe(2);
    expect(tasks.records).toEqual([{ id: 't1' }, { id: 't2' }]);
    // workflows are hydrated by id (listSummaries is thin).
    expect(domains.find((d) => d.domain === 'workflows')!.records).toEqual([{ id: 'w1', nodes: [] }]);
  });

  it('honours a domains allowlist', () => {
    const { svc } = build(handle.db);
    const { summary: manifest } = svc.export({ domains: ['tasks', 'notes'], includeSecrets: false });
    expect(manifest.domains).toEqual(['tasks', 'notes']);
  });
});
