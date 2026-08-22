import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../../db/db.module';
import { CryptoService } from '../../crypto/crypto.service';
import { workflowCredentials, type WorkflowCredentialRow } from '../../db/schema';

/** What the service hands the repo to persist — `data` is plaintext JSON; the repo
 *  encrypts it before it ever touches disk. */
export interface WorkflowCredentialWrite {
  id: string;
  name: string;
  type: string;
  data: string;
  /** Owning user, or null for a credential shared with the whole install. */
  userId?: string | null;
  teamId?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class WorkflowCredentialsRepository {
  private readonly logger = new Logger(WorkflowCredentialsRepository.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: MidniteDb,
    @Inject(CryptoService) private readonly crypto: CryptoService,
  ) {
    if (!this.crypto.isEnabled()) {
      this.logger.warn(
        'Workflow credentials are FAIL-CLOSED: MIDNITE_SECRET_KEY is unset, so stored secrets ' +
          'are unusable and new credentials cannot be saved. Set a 32-byte hex/base64 ' +
          'MIDNITE_SECRET_KEY to enable workflow credentials at rest.',
      );
    }
  }

  /** Every credential, unscoped. Existing callers (the vault UI, executors resolving by
   *  id) keep this behaviour — Phase 84 Theme A adds scope as new methods, not as a
   *  change to this one. */
  list(): WorkflowCredentialRow[] {
    return this.db.select().from(workflowCredentials).all();
  }

  /**
   * The acting user's **own** credential of `type` — null-owner rows deliberately
   * excluded. This backs "is *your* GitHub connected?", where an install-wide PAT is the
   * wrong answer: it would let the UI claim a personal connection the user never made.
   */
  findOwnedByType(userId: string, type: string): WorkflowCredentialRow | undefined {
    return this.db
      .select()
      .from(workflowCredentials)
      .where(and(eq(workflowCredentials.userId, userId), eq(workflowCredentials.type, type)))
      // Newest wins. Connect replaces on re-connect so there should only ever be one, but
      // an unordered `.get()` would silently return whichever row SQLite reached first —
      // and "silently returns the stale token" is precisely the failure to design out.
      .orderBy(desc(workflowCredentials.createdAt))
      .get();
  }

  get(id: string): WorkflowCredentialRow | undefined {
    return this.db.select().from(workflowCredentials).where(eq(workflowCredentials.id, id)).get();
  }

  /**
   * Persist a credential with its secret payload encrypted first. FAIL-CLOSED:
   * `crypto.encrypt` throws when no `MIDNITE_SECRET_KEY` is set, so the write is
   * rejected rather than silently storing plaintext.
   */
  insert(write: WorkflowCredentialWrite): WorkflowCredentialRow {
    return this.db
      .insert(workflowCredentials)
      .values({
        ...write,
        userId: write.userId ?? null,
        teamId: write.teamId ?? null,
        data: this.crypto.encrypt(write.data),
      })
      .returning()
      .get();
  }

  /** Decrypt the stored secret blob to plaintext JSON. `null` when the key is
   *  missing/rotated (fail-closed) — the credential reads as unusable. */
  decryptData(row: WorkflowCredentialRow): string | null {
    return this.crypto.decrypt(row.data);
  }

  remove(id: string): boolean {
    return (
      this.db.delete(workflowCredentials).where(eq(workflowCredentials.id, id)).run().changes > 0
    );
  }
}
