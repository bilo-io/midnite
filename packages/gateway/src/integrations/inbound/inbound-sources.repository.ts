import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, isNull } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../../db/db.module';
import { inboundSources, type InboundSourceInsert, type InboundSourceRow } from '../../db/schema';

/** Drizzle-only access to the team-scoped `inbound_sources` table. */
@Injectable()
export class InboundSourcesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  list(teamId: string | null): InboundSourceRow[] {
    return this.db
      .select()
      .from(inboundSources)
      .where(teamId === null ? isNull(inboundSources.teamId) : eq(inboundSources.teamId, teamId))
      .orderBy(desc(inboundSources.createdAt))
      .all();
  }

  findById(id: string): InboundSourceRow | undefined {
    return this.db.select().from(inboundSources).where(eq(inboundSources.id, id)).get();
  }

  insert(row: InboundSourceInsert): InboundSourceRow {
    return this.db.insert(inboundSources).values(row).returning().get();
  }

  update(id: string, fields: Partial<InboundSourceInsert>): InboundSourceRow | undefined {
    return this.db.update(inboundSources).set(fields).where(eq(inboundSources.id, id)).returning().get();
  }

  remove(id: string): void {
    this.db.delete(inboundSources).where(eq(inboundSources.id, id)).run();
  }
}
