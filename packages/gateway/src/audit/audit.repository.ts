import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { auditLog, type AuditLogInsert, type AuditLogRow } from '../db/schema';

export interface AuditListFilter {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: AuditLogInsert): AuditLogRow {
    return this.db.insert(auditLog).values(row).returning().get();
  }

  list(filter: AuditListFilter = {}): { rows: AuditLogRow[]; total: number } {
    const conditions = [];
    if (filter.entityType) conditions.push(eq(auditLog.entityType, filter.entityType));
    if (filter.entityId) conditions.push(eq(auditLog.entityId, filter.entityId));
    if (filter.userId) conditions.push(eq(auditLog.userId, filter.userId));
    if (filter.action) conditions.push(eq(auditLog.action, filter.action));
    if (filter.from) conditions.push(gte(auditLog.createdAt, filter.from));
    if (filter.to) conditions.push(lte(auditLog.createdAt, filter.to));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;

    const rows = this.db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(limit)
      .offset(offset)
      .all();

    const [countRow] = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(auditLog)
      .where(where)
      .all();

    return { rows, total: countRow ? Number(countRow.count) : 0 };
  }
}
