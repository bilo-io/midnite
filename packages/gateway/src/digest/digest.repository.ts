import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { digests, type DigestInsert, type DigestRow } from '../db/schema';

/**
 * Drizzle-only data access for stored fleet digests (Phase 62 C). One row per
 * generated digest; product data (never pruned by P61 retention).
 */
@Injectable()
export class DigestRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: DigestInsert): DigestRow {
    return this.db.insert(digests).values(row).returning().get();
  }

  getById(id: string): DigestRow | undefined {
    return this.db.select().from(digests).where(eq(digests.id, id)).get();
  }

  /** Digests newest-first, for a feed/list. */
  list(limit: number, offset = 0): DigestRow[] {
    return this.db.select().from(digests).orderBy(desc(digests.createdAt)).limit(limit).offset(offset).all();
  }
}
