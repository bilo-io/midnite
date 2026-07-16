import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, inArray, isNull, or, eq, sql } from 'drizzle-orm';
import type { Notification, TeamScope } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { notifications, type NotificationInsert, type NotificationRow } from '../db/schema';

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: NotificationInsert): NotificationRow {
    return this.db.insert(notifications).values(row).returning().get();
  }

  /** Page the feed unread-first, then newest-first, scoped to the caller's team. */
  list(limit: number, offset: number, scope?: TeamScope): NotificationRow[] {
    const where = scope?.teamId
      ? or(eq(notifications.teamId, scope.teamId), isNull(notifications.teamId))
      : undefined;
    return this.db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(sql`${notifications.readAt} is null desc`, desc(notifications.createdAt), desc(notifications.id))
      .limit(limit)
      .offset(offset)
      .all();
  }

  countUnread(scope?: TeamScope): number {
    const teamFilter = scope?.teamId
      ? or(eq(notifications.teamId, scope.teamId), isNull(notifications.teamId))
      : undefined;
    return (
      this.db
        .select({ n: count() })
        .from(notifications)
        .where(and(isNull(notifications.readAt), teamFilter))
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

  /**
   * Phase 69 B — mark every still-unread notification for one entity (and one of
   * the given kinds) read. Used for resume hygiene: once a task leaves `waiting`
   * its "needs your input" alerts are stale. Returns the number cleared (0 = none
   * matched), so callers can skip logging on a no-op.
   */
  markReadForEntity(entityType: string, entityId: string, kinds: string[], at: string): number {
    if (kinds.length === 0) return 0;
    return this.db
      .update(notifications)
      .set({ readAt: at })
      .where(
        and(
          eq(notifications.entityType, entityType),
          eq(notifications.entityId, entityId),
          inArray(notifications.kind, kinds),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id })
      .all().length;
  }

  /** Delete a single notification by id; no-op if it doesn't exist. */
  remove(id: string): void {
    this.db.delete(notifications).where(eq(notifications.id, id)).run();
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
      teamId: row.teamId ?? undefined,
    };
  }
}
