import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';

import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { sessionUsage, tasks, type SessionUsageInsert, type SessionUsageRow } from '../db/schema';

/**
 * One harvested session's usage joined to its task's repo/project (Phase 61 B).
 * `session_usage.sessionId === tasks.id`; a LEFT join so a session whose task
 * was since deleted still contributes (repo/project null). No FK — this
 * cross-domain join is read-only, per the schema's no-cross-domain-FK rule.
 */
export interface SessionUsageAttributionRow {
  sessionId: string;
  taskTitle: string | null;
  repo: string | null;
  projectId: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  cachedReadTokens: number;
  cachedWriteTokens: number;
  estCostUsd: number | null;
  updatedAt: string;
}

/** Drizzle access for the harvested `session_usage` table (Phase 61 A). */
@Injectable()
export class SessionUsageRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  /** Upsert one session's harvested usage (pk = sessionId). */
  upsert(row: SessionUsageInsert): void {
    this.db
      .insert(sessionUsage)
      .values(row)
      .onConflictDoUpdate({ target: sessionUsage.sessionId, set: row })
      .run();
  }

  /** The harvested row for a session, or undefined when none has been harvested. */
  get(sessionId: string): SessionUsageRow | undefined {
    return this.db
      .select()
      .from(sessionUsage)
      .where(eq(sessionUsage.sessionId, sessionId))
      .get();
  }

  /** Harvested rows for many sessions in one query (the list read path). */
  getMany(sessionIds: string[]): SessionUsageRow[] {
    if (sessionIds.length === 0) return [];
    return this.db
      .select()
      .from(sessionUsage)
      .where(inArray(sessionUsage.sessionId, sessionIds))
      .all();
  }

  /**
   * All harvested rows whose `updatedAt` falls in the inclusive [from, to]
   * window, each joined to its task's title/repo/project for cost attribution
   * (Phase 61 B). Both bounds optional. Aggregation is done in the service.
   */
  listAttributionInRange(from?: string, to?: string): SessionUsageAttributionRow[] {
    const conditions = [
      ...(from ? [gte(sessionUsage.updatedAt, from)] : []),
      ...(to ? [lte(sessionUsage.updatedAt, to)] : []),
    ];
    const query = this.db
      .select({
        sessionId: sessionUsage.sessionId,
        taskTitle: tasks.title,
        repo: tasks.repo,
        projectId: tasks.projectId,
        model: sessionUsage.model,
        inputTokens: sessionUsage.inputTokens,
        outputTokens: sessionUsage.outputTokens,
        cachedReadTokens: sessionUsage.cachedReadTokens,
        cachedWriteTokens: sessionUsage.cachedWriteTokens,
        estCostUsd: sessionUsage.estCostUsd,
        updatedAt: sessionUsage.updatedAt,
      })
      .from(sessionUsage)
      .leftJoin(tasks, eq(tasks.id, sessionUsage.sessionId));
    return conditions.length ? query.where(and(...conditions)).all() : query.all();
  }
}
