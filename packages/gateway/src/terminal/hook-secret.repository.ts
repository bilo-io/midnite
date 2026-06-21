import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { hookSecrets } from '../db/schema';

/**
 * Durable store for per-session hook-secret *hashes* (Phase 17 §C2). Persisting
 * them lets a durable `tmux` session reattached after a gateway restart still
 * authenticate its in-PTY PreToolUse/Stop/Notification callbacks — the in-memory
 * map is gone, but the running process's env still carries the plaintext, whose
 * hash we can re-load here. Drizzle queries only; no business rules.
 */
@Injectable()
export class HookSecretRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  upsert(sessionId: string, secretHash: string, createdAt: string): void {
    this.db
      .insert(hookSecrets)
      .values({ sessionId, secretHash, createdAt })
      .onConflictDoUpdate({ target: hookSecrets.sessionId, set: { secretHash, createdAt } })
      .run();
  }

  find(sessionId: string): string | undefined {
    return this.db
      .select({ secretHash: hookSecrets.secretHash })
      .from(hookSecrets)
      .where(eq(hookSecrets.sessionId, sessionId))
      .get()?.secretHash;
  }

  delete(sessionId: string): void {
    this.db.delete(hookSecrets).where(eq(hookSecrets.sessionId, sessionId)).run();
  }
}
