import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import type { GlobalSource, SourceKind } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { globalSources, type GlobalSourceInsert, type GlobalSourceRow } from '../db/schema';

@Injectable()
export class KnowledgeRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insertSource(row: GlobalSourceInsert): GlobalSourceRow {
    return this.db.insert(globalSources).values(row).returning().get();
  }

  listSources(): GlobalSourceRow[] {
    return this.db.select().from(globalSources).orderBy(asc(globalSources.createdAt)).all();
  }

  getSource(id: string): GlobalSourceRow | undefined {
    return this.db.select().from(globalSources).where(eq(globalSources.id, id)).get();
  }

  deleteSource(id: string): void {
    this.db.delete(globalSources).where(eq(globalSources.id, id)).run();
  }

  count(): number {
    const row = this.db.select({ c: sql<number>`COUNT(*)` }).from(globalSources).get();
    return Number(row?.c ?? 0);
  }

  toSource(row: GlobalSourceRow): GlobalSource {
    return {
      id: row.id,
      url: row.url,
      kind: row.kind as SourceKind,
      title: row.title ?? undefined,
      faviconUrl: row.faviconUrl ?? undefined,
      fetchedAt: row.fetchedAt ?? undefined,
      createdAt: row.createdAt,
    };
  }
}
