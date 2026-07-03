import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { schemaMeta } from './schema';
import type { MidniteDb } from './db.module';

// Phase 49 A — a runtime "schema version" = the drizzle journal's highest applied
// migration index. Data portability stamps archives with it and compares it across
// instances (see `compareSchemaVersion` in @midnite/shared). Written to the
// `schema_meta` singleton on every boot (after `migrate`), read back cheaply.

const SINGLETON = 'singleton';

type JournalEntry = { idx: number };
type Journal = { entries?: JournalEntry[] };

/** Highest migration idx in the drizzle journal at `<migrationsDir>/meta/_journal.json`.
 *  Returns -1 when the journal is missing/empty/unreadable (fail-soft — boot proceeds). */
export function readJournalVersion(migrationsDir: string): number {
  try {
    const raw = readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf8');
    const journal = JSON.parse(raw) as Journal;
    const entries = journal.entries ?? [];
    if (entries.length === 0) return -1;
    return entries.reduce((max, e) => (typeof e.idx === 'number' && e.idx > max ? e.idx : max), -1);
  } catch {
    return -1;
  }
}

/** Upsert the schema-version stamp from the journal. Called once on boot. Returns
 *  the stamped version (or -1 if the journal couldn't be read, in which case no
 *  row is written and the store is treated as version-unknown). */
export function stampSchemaVersion(db: MidniteDb, migrationsDir: string, now: string): number {
  const version = readJournalVersion(migrationsDir);
  if (version < 0) return -1;
  db.insert(schemaMeta)
    .values({ id: SINGLETON, schemaVersion: version, updatedAt: now })
    .onConflictDoUpdate({ target: schemaMeta.id, set: { schemaVersion: version, updatedAt: now } })
    .run();
  return version;
}

/** Read the stored schema version. Returns -1 when unstamped (e.g. journal missing). */
export function getSchemaVersion(db: MidniteDb): number {
  const row = db.select().from(schemaMeta).where(eq(schemaMeta.id, SINGLETON)).get();
  return row?.schemaVersion ?? -1;
}
