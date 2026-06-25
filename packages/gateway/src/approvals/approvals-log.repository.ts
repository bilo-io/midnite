import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, gte, lte, eq } from 'drizzle-orm';
import type { ApprovalLogEntry } from '@midnite/shared';
import type { MidniteDb } from '../db/db.module';
import { DB_TOKEN } from '../db/db.module';
import { approvalLog, type ApprovalLogInsert } from '../db/schema';

export interface LogListOpts {
  sessionId?: string;
  taskId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ApprovalsLogRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(entry: Omit<ApprovalLogInsert, 'id'>): void {
    this.db
      .insert(approvalLog)
      .values({ id: randomUUID(), ...entry })
      .run();
  }

  list(opts: LogListOpts = {}): { entries: ApprovalLogEntry[]; total: number } {
    const { sessionId, taskId, from, to, limit = 50, offset = 0 } = opts;

    const filters = [];
    if (sessionId) filters.push(eq(approvalLog.sessionId, sessionId));
    if (taskId) filters.push(eq(approvalLog.taskId, taskId));
    if (from) filters.push(gte(approvalLog.createdAt, from));
    if (to) filters.push(lte(approvalLog.createdAt, to));

    const where = filters.length > 0 ? and(...filters) : undefined;

    const rows = this.db
      .select()
      .from(approvalLog)
      .where(where)
      .orderBy(desc(approvalLog.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    const totalResult = this.db
      .select({ total: count() })
      .from(approvalLog)
      .where(where)
      .get();
    const total = totalResult?.total ?? 0;

    return {
      entries: rows.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        taskId: r.taskId ?? null,
        toolName: r.toolName,
        summary: r.summary,
        resolution: r.resolution as ApprovalLogEntry['resolution'],
        ruleId: r.ruleId ?? null,
        decidedBy: r.decidedBy as ApprovalLogEntry['decidedBy'],
        createdAt: r.createdAt,
      })),
      total,
    };
  }
}
