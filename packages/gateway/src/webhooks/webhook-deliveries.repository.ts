import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  webhookDeliveries,
  type WebhookDeliveryInsert,
  type WebhookDeliveryRow,
} from '../db/schema';

/** Drizzle-only access to the `webhook_deliveries` log. */
@Injectable()
export class WebhookDeliveriesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: WebhookDeliveryInsert): WebhookDeliveryRow {
    return this.db.insert(webhookDeliveries).values(row).returning().get();
  }

  /** Most-recent-first deliveries for one endpoint (Theme D log). */
  listByWebhook(webhookId: string, limit = 50): WebhookDeliveryRow[] {
    return this.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)
      .all();
  }

  findById(id: string): WebhookDeliveryRow | undefined {
    return this.db.select().from(webhookDeliveries).where(eq(webhookDeliveries.id, id)).get();
  }
}
