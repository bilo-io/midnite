import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, gte, lte, eq } from 'drizzle-orm';

import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { approvalLog, type ApprovalLogInsert, type ApprovalLogRow } from '../db/schema';

export type ApprovalLogListParams = {
  page: number;
  limit: number;
  from?: string;
  to?: string;
  taskId?: string;
  sessionId?: string;
};

@Injectable()
export class ApprovalLogRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(entry: ApprovalLogInsert): void {
    this.db.insert(approvalLog).values(entry).run();
  }

  list(params: ApprovalLogListParams): { entries: ApprovalLogRow[]; total: number } {
    const { page, limit, from, to, taskId, sessionId } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (from) conditions.push(gte(approvalLog.createdAt, from));
    if (to) conditions.push(lte(approvalLog.createdAt, to));
    if (taskId) conditions.push(eq(approvalLog.taskId, taskId));
    if (sessionId) conditions.push(eq(approvalLog.sessionId, sessionId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const total = this.db
      .select({ value: count() })
      .from(approvalLog)
      .where(where)
      .get()?.value ?? 0;

    const entries = this.db
      .select()
      .from(approvalLog)
      .where(where)
      .orderBy(desc(approvalLog.createdAt), desc(approvalLog.id))
      .limit(limit)
      .offset(offset)
      .all();

    return { entries, total };
  }
}
