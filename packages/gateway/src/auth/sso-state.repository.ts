import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { ssoAuthState, type SsoAuthStateInsert, type SsoAuthStateRow } from '../db/schema';

/**
 * Phase 70 C — Drizzle-only store for the single-use SSO handshake state (the
 * pre-callback `nonce` and the callback→web `code`). No business rules here; the
 * TTL/consume policy is `SsoService`. `take` deletes-and-returns in one statement
 * (better-sqlite3 is synchronous, so this is atomically single-use — a replayed id
 * finds nothing on the second call).
 */
@Injectable()
export class SsoStateRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: SsoAuthStateInsert): SsoAuthStateRow {
    return this.db.insert(ssoAuthState).values(row).returning().get();
  }

  /** Consume a row by id + kind: delete it and return what was deleted (or undefined). */
  take(id: string, kind: 'nonce' | 'code'): SsoAuthStateRow | undefined {
    return this.db
      .delete(ssoAuthState)
      .where(and(eq(ssoAuthState.id, id), eq(ssoAuthState.kind, kind)))
      .returning()
      .get();
  }

  /** Prune every row whose TTL elapsed before `nowMs` (epoch ms). */
  pruneExpired(nowMs: number): void {
    this.db.delete(ssoAuthState).where(lt(ssoAuthState.expiresAt, nowMs)).run();
  }
}
