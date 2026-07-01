import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../../db/db.module';
import {
  inboundDeliveries,
  type InboundDeliveryInsert,
  type InboundDeliveryRow,
} from '../../db/schema';

/** Drizzle-only access to the `inbound_deliveries` table (Phase 46 B/D). */
@Injectable()
export class InboundDeliveriesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: InboundDeliveryInsert): InboundDeliveryRow {
    return this.db.insert(inboundDeliveries).values(row).returning().get();
  }

  listBySource(sourceId: string): InboundDeliveryRow[] {
    return this.db
      .select()
      .from(inboundDeliveries)
      .where(eq(inboundDeliveries.sourceId, sourceId))
      .orderBy(desc(inboundDeliveries.createdAt))
      .all();
  }

  /**
   * A prior **successful** (`created`) delivery for this (source, externalId) —
   * the dedup probe. Only created rows count, so a retry after a failure/rejection
   * can still land a task.
   */
  findCreated(sourceId: string, externalId: string): InboundDeliveryRow | undefined {
    return this.db
      .select()
      .from(inboundDeliveries)
      .where(
        and(
          eq(inboundDeliveries.sourceId, sourceId),
          eq(inboundDeliveries.externalId, externalId),
          eq(inboundDeliveries.result, 'created'),
        ),
      )
      .get();
  }
}
