import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { sessionUsage, type SessionUsageInsert, type SessionUsageRow } from '../db/schema';

/** Drizzle access for the harvested `session_usage` table (Phase 61 A). */
@Injectable()
export class SessionUsageRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  /** Upsert one session's harvested usage (pk = sessionId). */
  upsert(row: SessionUsageInsert): void {
    this.db
      .insert(sessionUsage)
      .values(row)
      .onConflictDoUpdate({ target: sessionUsage.sessionId, set: row })
      .run();
  }

  /** The harvested row for a session, or undefined when none has been harvested. */
  get(sessionId: string): SessionUsageRow | undefined {
    return this.db
      .select()
      .from(sessionUsage)
      .where(eq(sessionUsage.sessionId, sessionId))
      .get();
  }

  /** Harvested rows for many sessions in one query (the list read path). */
  getMany(sessionIds: string[]): SessionUsageRow[] {
    if (sessionIds.length === 0) return [];
    return this.db
      .select()
      .from(sessionUsage)
      .where(inArray(sessionUsage.sessionId, sessionIds))
      .all();
  }
}
