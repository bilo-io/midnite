import { Inject, Injectable } from '@nestjs/common';
import { and, gte, lte } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { llmUsage, type LlmUsageInsert, type LlmUsageRow } from '../db/schema';

/** Drizzle queries for the append-only `llm_usage` table. No business rules. */
@Injectable()
export class UsageRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: LlmUsageInsert): void {
    this.db.insert(llmUsage).values(row).run();
  }

  /**
   * All usage rows within an inclusive [from, to] ISO-timestamp window. Both
   * bounds optional. Returned newest-first via the `at` index; the service does
   * the grouping/aggregation in memory (windows are small in practice).
   */
  listInRange(from?: string, to?: string): LlmUsageRow[] {
    const conditions = [
      ...(from ? [gte(llmUsage.at, from)] : []),
      ...(to ? [lte(llmUsage.at, to)] : []),
    ];
    const query = this.db.select().from(llmUsage);
    const rows = conditions.length ? query.where(and(...conditions)).all() : query.all();
    return rows;
  }
}
