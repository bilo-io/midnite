import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CryptoService, SECRET_KEY_ENV } from '../crypto/crypto.service';
import { llmProviders, teamMemberships, teams, userPreferences, users, webhooks, workflowCredentials } from '../db/schema';
import { createTestDb, type TestDbHandle } from '../test/db';
import { unpackArchive } from './lib/archive';
import { PortabilityImportService } from './portability-import.service';
import { PortabilityService } from './portability.service';

// Two distinct per-instance keys (64-char hex → 32 bytes). Source encrypts under
// KEY_A; the target re-encrypts under KEY_B — proving raw blobs aren't portable.
const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);
const NOW = '2026-07-10T00:00:00.000Z';
const PASSPHRASE = 'correct horse battery staple';

// Only the read methods the export orchestrator calls — the Theme-G domains are
// read straight from the DB, so the service fakes can stay empty.
function emptyServices() {
  return {
    tasks: { listTasks: () => [] },
    projects: { listProjects: () => [] },
    repos: { list: () => [] },
    memories: { listMemories: () => [] },
    notes: { listNotes: () => [] },
    routines: { listRoutines: () => [] },
    media: { listMedia: () => [] },
    councils: { listCouncils: () => [] },
    ideas: { listIdeas: () => ({ ideas: [], total: 0 }) },
    approvals: { list: () => [] },
    workflows: { listSummaries: () => [], getWorkflow: () => ({}) },
  };
}

function exportSvc(handle: TestDbHandle, crypto: CryptoService) {
  const s = emptyServices();
  return new PortabilityService(
    handle.db, crypto as never,
    s.tasks as never, s.projects as never, s.repos as never, s.memories as never,
    s.notes as never, s.routines as never, s.media as never, s.councils as never,
    s.ideas as never, s.approvals as never, s.workflows as never,
  );
}

/** Seed a source instance: a user (+team), and one of each secret-bearing entity,
 *  with the secret encrypted under the currently-configured instance key. */
function seedSource(handle: TestDbHandle, crypto: CryptoService): void {
  const db = handle.db;
  db.insert(users).values({ id: 'u1', email: 'a@b.co', name: 'Ada', passwordHash: 'bcrypt$hash', createdAt: NOW, updatedAt: NOW }).run();
  db.insert(userPreferences).values({ userId: 'u1', data: JSON.stringify({ theme: 'dark' }), updatedAt: NOW }).run();
  db.insert(teams).values({ id: 'tm1', slug: 'core', name: 'Core', createdBy: 'u1', createdAt: NOW }).run();
  db.insert(teamMemberships).values({ teamId: 'tm1', userId: 'u1', role: 'owner', joinedAt: NOW }).run();
  db.insert(webhooks).values({
    id: 'wh1', teamId: 'tm1', createdBy: 'u1', url: 'https://hooks.test/x', provider: 'slack',
    eventFilter: JSON.stringify({ events: ['task.done'] }), secret: crypto.encrypt('wh-signing-secret'),
    enabled: true, createdAt: NOW, updatedAt: NOW,
  }).run();
  db.insert(llmProviders).values({ provider: 'anthropic', apiKey: crypto.encrypt('sk-ant-123'), baseUrl: null, planModel: 'x', actModel: 'y', updatedAt: NOW }).run();
  db.insert(workflowCredentials).values({ id: 'cr1', name: 'gh', type: 'api-key', data: crypto.encrypt(JSON.stringify({ type: 'api-key', apiKey: 'ghp_1' })), createdAt: NOW, updatedAt: NOW }).run();
}

describe('Phase 49 G — secrets + users/teams round-trip', () => {
  let source: TestDbHandle;
  let target: TestDbHandle;
  const crypto = new CryptoService();

  beforeEach(() => {
    source = createTestDb();
    target = createTestDb();
    process.env[SECRET_KEY_ENV] = KEY_A;
    seedSource(source, crypto);
  });
  afterEach(() => {
    source.close();
    target.close();
    delete process.env[SECRET_KEY_ENV];
  });

  const targetRow = (sql: string) => target.sqlite.prepare(sql).get() as Record<string, unknown> | undefined;

  it('default export carries integration config but NO decryptable secret material', () => {
    const { archive, summary } = exportSvc(source, crypto).export({ includeSecrets: false });
    expect(summary.secretsMode).toBe('excluded');
    expect(summary.domains).not.toContain('secrets');
    // The webhook row rides along, but its signing secret is a placeholder, not ciphertext.
    const { domains } = unpackArchive(archive);
    const firstOf = (name: string) =>
      (domains.find((d) => d.domain === name)!.records as Array<Record<string, unknown>>)[0]!;
    expect(firstOf('webhooks').url).toBe('https://hooks.test/x');
    expect(firstOf('webhooks').secret).toBe('');
    expect(firstOf('llmProviders').apiKey).toBeNull();
  });

  it('passphrase round-trip re-encrypts secrets under the TARGET key + restores login', () => {
    const { archive, summary } = exportSvc(source, crypto).export({ includeSecrets: true, passphrase: PASSPHRASE });
    expect(summary.secretsMode).toBe('passphrase');
    expect(summary.domains).toContain('secrets');
    expect(summary.kdf?.salt).toBeTruthy();
    expect(summary.counts.secrets).toBe(3); // webhook + provider + credential

    // Import into a DIFFERENT instance (KEY_B).
    process.env[SECRET_KEY_ENV] = KEY_B;
    const imp = new PortabilityImportService(target.db, crypto as never);
    const res = imp.restore(archive, { mode: 'replace', dryRun: false, passphrase: PASSPHRASE });
    expect(res.secretsRestored).toBe(3);
    expect(res.secretsSkipped).toBe(0);

    // User + password hash restored → login survives the move.
    expect(targetRow("SELECT password_hash AS h FROM users WHERE id='u1'")?.h).toBe('bcrypt$hash');
    expect(targetRow("SELECT role AS r FROM team_memberships WHERE team_id='tm1'")?.r).toBe('owner');

    // Secrets are re-encrypted under KEY_B (not the source blob) and decrypt cleanly.
    const whSecret = targetRow("SELECT secret AS s FROM webhooks WHERE id='wh1'")?.s as string;
    expect(whSecret.startsWith('v1:')).toBe(true);
    expect(crypto.decrypt(whSecret)).toBe('wh-signing-secret');
    expect(crypto.decrypt(targetRow("SELECT api_key AS k FROM llm_providers WHERE provider='anthropic'")?.k as string)).toBe('sk-ant-123');
    expect(JSON.parse(crypto.decrypt(targetRow("SELECT data AS d FROM workflow_credentials WHERE id='cr1'")?.d as string)!).apiKey).toBe('ghp_1');
  });

  it('a WRONG passphrase rolls the entire restore back (no half-write)', () => {
    const { archive } = exportSvc(source, crypto).export({ includeSecrets: true, passphrase: PASSPHRASE });
    process.env[SECRET_KEY_ENV] = KEY_B;
    const imp = new PortabilityImportService(target.db, crypto as never);
    expect(() => imp.restore(archive, { mode: 'replace', dryRun: false, passphrase: 'wrong-passphrase' })).toThrow(/passphrase/i);
    // Nothing landed — the transaction rolled back including the user rows.
    expect(targetRow('SELECT COUNT(*) AS n FROM users')?.n).toBe(0);
    expect(targetRow('SELECT COUNT(*) AS n FROM webhooks')?.n).toBe(0);
  });

  it('no target key ⇒ secrets skipped, everything else still imports', () => {
    const { archive } = exportSvc(source, crypto).export({ includeSecrets: true, passphrase: PASSPHRASE });
    delete process.env[SECRET_KEY_ENV]; // target has no instance key → cannot re-encrypt
    const imp = new PortabilityImportService(target.db, crypto as never);
    const res = imp.restore(archive, { mode: 'replace', dryRun: false, passphrase: PASSPHRASE });
    expect(res.secretsRestored).toBe(0);
    expect(res.secretsSkipped).toBe(3);
    // Config rows still imported; the webhook secret stays the placeholder.
    expect(targetRow("SELECT COUNT(*) AS n FROM users")?.n).toBe(1);
    expect(targetRow("SELECT secret AS s FROM webhooks WHERE id='wh1'")?.s).toBe('');
  });

  it('preview warns about users + secrets before a destructive restore', () => {
    const { archive } = exportSvc(source, crypto).export({ includeSecrets: true, passphrase: PASSPHRASE });
    const imp = new PortabilityImportService(target.db, crypto as never);
    const preview = imp.preview(archive);
    expect(preview.warnings.some((w) => /user account/i.test(w))).toBe(true);
    expect(preview.warnings.some((w) => /secret/i.test(w))).toBe(true);
  });
});
