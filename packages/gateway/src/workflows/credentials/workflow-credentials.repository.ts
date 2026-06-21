import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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

  list(): WorkflowCredentialRow[] {
    return this.db.select().from(workflowCredentials).all();
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
      .values({ ...write, data: this.crypto.encrypt(write.data) })
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
