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
    return this.db
      .select()
      .from(globalSources)
      // Explicit order first; createdAt breaks ties (e.g. legacy rows at 0).
      .orderBy(asc(globalSources.position), asc(globalSources.createdAt))
      .all();
  }

  getSource(id: string): GlobalSourceRow | undefined {
    return this.db.select().from(globalSources).where(eq(globalSources.id, id)).get();
  }

  deleteSource(id: string): void {
    this.db.delete(globalSources).where(eq(globalSources.id, id)).run();
  }

  /** Next append position (max existing + 1, or 0 when empty). */
  nextPosition(): number {
    const rows = this.db.select({ position: globalSources.position }).from(globalSources).all();
    return rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;
  }

  /** Persist a new order: each id's position becomes its index in the list. */
  reorderSources(orderedIds: string[]): void {
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(globalSources).set({ position }).where(eq(globalSources.id, id)).run();
      });
    });
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
