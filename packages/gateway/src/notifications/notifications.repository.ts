import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, inArray, isNull, sql } from 'drizzle-orm';
import type { Notification } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { notifications, type NotificationInsert, type NotificationRow } from '../db/schema';

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: NotificationInsert): NotificationRow {
    return this.db.insert(notifications).values(row).returning().get();
  }

  /** Page the feed unread-first, then newest-first. */
  list(limit: number, offset: number): NotificationRow[] {
    return this.db
      .select()
      .from(notifications)
      .orderBy(sql`${notifications.readAt} is null desc`, desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
  }

  countUnread(): number {
    return (
      this.db
        .select({ n: count() })
        .from(notifications)
        .where(isNull(notifications.readAt))
        .get()?.n ?? 0
    );
  }

  /** Mark the given still-unread ids read; no-op on an empty list. */
  markRead(ids: string[], at: string): void {
    if (ids.length === 0) return;
    this.db
      .update(notifications)
      .set({ readAt: at })
      .where(and(inArray(notifications.id, ids), isNull(notifications.readAt)))
      .run();
  }

  markAllRead(at: string): void {
    this.db.update(notifications).set({ readAt: at }).where(isNull(notifications.readAt)).run();
  }

  clear(): void {
    this.db.delete(notifications).run();
  }

  hydrate(row: NotificationRow): Notification {
    return {
      id: row.id,
      kind: row.kind as Notification['kind'],
      severity: row.severity as Notification['severity'],
      title: row.title,
      body: row.body,
      entity: { type: row.entityType, id: row.entityId },
      route: row.route,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }
}
