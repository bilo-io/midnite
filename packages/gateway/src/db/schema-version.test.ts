import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test';
import { getSchemaVersion, readJournalVersion, stampSchemaVersion } from './schema-version';

const MIGRATIONS_DIR = resolve(__dirname, '../../drizzle');

describe('schema-version stamp (Phase 49 A)', () => {
  let h: TestDbHandle;
  beforeEach(() => (h = createTestDb()));
  afterEach(() => h.close());

  it('reads the journal max idx (>= the latest migration)', () => {
    const v = readJournalVersion(MIGRATIONS_DIR);
    // The schema_meta migration (0066) is the newest as of this slice.
    expect(v).toBeGreaterThanOrEqual(66);
  });

  it('returns -1 for a missing/unreadable journal', () => {
    expect(readJournalVersion('/no/such/dir')).toBe(-1);
  });

  it('is unstamped until stampSchemaVersion runs', () => {
    // createTestDb migrates but does not stamp (that is DbFactory boot's job).
    expect(getSchemaVersion(h.db)).toBe(-1);
  });

  it('stamps the journal version and reads it back', () => {
    const stamped = stampSchemaVersion(h.db, MIGRATIONS_DIR, '2026-07-03T00:00:00Z');
    expect(stamped).toBe(readJournalVersion(MIGRATIONS_DIR));
    expect(getSchemaVersion(h.db)).toBe(stamped);
  });

  it('is idempotent — a second stamp overwrites the singleton (no duplicate row)', () => {
    stampSchemaVersion(h.db, MIGRATIONS_DIR, '2026-07-03T00:00:00Z');
    const second = stampSchemaVersion(h.db, MIGRATIONS_DIR, '2026-07-03T01:00:00Z');
    expect(getSchemaVersion(h.db)).toBe(second);
  });

  it('does not stamp when the journal is unreadable', () => {
    expect(stampSchemaVersion(h.db, '/no/such/dir', '2026-07-03T00:00:00Z')).toBe(-1);
    expect(getSchemaVersion(h.db)).toBe(-1);
  });
});
