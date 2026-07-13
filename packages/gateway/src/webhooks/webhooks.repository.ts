import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, isNull } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { webhooks, type WebhookInsert, type WebhookRow } from '../db/schema';

/** Drizzle-only access to the team-scoped `webhooks` table. */
@Injectable()
export class WebhooksRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  list(teamId: string | null): WebhookRow[] {
    return this.db
      .select()
      .from(webhooks)
      .where(teamId === null ? isNull(webhooks.teamId) : eq(webhooks.teamId, teamId))
      .orderBy(desc(webhooks.createdAt))
      .all();
  }

  /**
   * Every endpoint across all teams. Used to fan out **global** events (Phase 62
   * `digest.generated`) that aren't scoped to a single team's task stream.
   */
  listAll(): WebhookRow[] {
    return this.db.select().from(webhooks).orderBy(desc(webhooks.createdAt)).all();
  }

  findById(id: string): WebhookRow | undefined {
    return this.db.select().from(webhooks).where(eq(webhooks.id, id)).get();
  }

  insert(row: WebhookInsert): WebhookRow {
    return this.db.insert(webhooks).values(row).returning().get();
  }

  update(id: string, fields: Partial<WebhookInsert>): WebhookRow | undefined {
    return this.db.update(webhooks).set(fields).where(eq(webhooks.id, id)).returning().get();
  }

  remove(id: string): void {
    this.db.delete(webhooks).where(eq(webhooks.id, id)).run();
  }
}
