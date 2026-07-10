import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm';
import type { Memory, MemorySource, SourceKind } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  memories,
  memorySources,
  type MemoryInsert,
  type MemoryRow,
  type MemorySourceInsert,
  type MemorySourceRow,
} from '../db/schema';

@Injectable()
export class MemoriesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insertMemory(row: MemoryInsert): MemoryRow {
    return this.db.insert(memories).values(row).returning().get();
  }

  listMemories(): MemoryRow[] {
    return this.db.select().from(memories).orderBy(desc(memories.updatedAt)).all();
  }

  /** Memories that apply to a project: its own plus every global memory. */
  listScoped(projectId: string): MemoryRow[] {
    return this.db
      .select()
      .from(memories)
      .where(or(isNull(memories.projectId), eq(memories.projectId, projectId)))
      .orderBy(desc(memories.updatedAt))
      .all();
  }

  getMemory(id: string): MemoryRow | undefined {
    return this.db.select().from(memories).where(eq(memories.id, id)).get();
  }

  updateMemory(id: string, patch: Partial<MemoryInsert>): MemoryRow | undefined {
    return this.db.update(memories).set(patch).where(eq(memories.id, id)).returning().get();
  }

  // Removing a memory also removes its sources, atomically.
  deleteMemory(id: string): void {
    this.db.transaction((tx) => {
      tx.delete(memorySources).where(eq(memorySources.memoryId, id)).run();
      tx.delete(memories).where(eq(memories.id, id)).run();
    });
  }

  // ---- sources ----

  insertSource(row: MemorySourceInsert): MemorySourceRow {
    return this.db.insert(memorySources).values(row).returning().get();
  }

  listSources(memoryId: string): MemorySourceRow[] {
    return this.db
      .select()
      .from(memorySources)
      .where(eq(memorySources.memoryId, memoryId))
      // Explicit order first; createdAt breaks ties (e.g. legacy rows at 0).
      .orderBy(asc(memorySources.position), asc(memorySources.createdAt))
      .all();
  }

  getSource(memoryId: string, sourceId: string): MemorySourceRow | undefined {
    return this.db
      .select()
      .from(memorySources)
      .where(and(eq(memorySources.id, sourceId), eq(memorySources.memoryId, memoryId)))
      .get();
  }

  /** Patch a source row (Phase 65 B: ingestion state / extracted text / metadata). */
  updateSource(
    memoryId: string,
    sourceId: string,
    patch: Partial<MemorySourceInsert>,
  ): MemorySourceRow | undefined {
    return this.db
      .update(memorySources)
      .set(patch)
      .where(and(eq(memorySources.id, sourceId), eq(memorySources.memoryId, memoryId)))
      .returning()
      .get();
  }

  deleteSource(memoryId: string, sourceId: string): void {
    this.db
      .delete(memorySources)
      .where(and(eq(memorySources.id, sourceId), eq(memorySources.memoryId, memoryId)))
      .run();
  }

  countSources(memoryId: string): number {
    const row = this.db
      .select({ c: sql<number>`COUNT(*)` })
      .from(memorySources)
      .where(eq(memorySources.memoryId, memoryId))
      .get();
    return Number(row?.c ?? 0);
  }

  /** Next append position for a memory (max existing + 1, or 0 when empty). */
  nextSourcePosition(memoryId: string): number {
    const rows = this.db
      .select({ position: memorySources.position })
      .from(memorySources)
      .where(eq(memorySources.memoryId, memoryId))
      .all();
    return rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;
  }

  /** Persist a new order: each id's position becomes its index in the list. */
  reorderSources(memoryId: string, orderedIds: string[]): void {
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(memorySources)
          .set({ position })
          .where(and(eq(memorySources.id, id), eq(memorySources.memoryId, memoryId)))
          .run();
      });
    });
  }

  hydrate(row: MemoryRow): Memory {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      projectId: row.projectId,
      sources: this.listSources(row.id).map((s) => this.toSource(s)),
      archived: row.archivedAt != null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toSource(row: MemorySourceRow): MemorySource {
    return {
      id: row.id,
      memoryId: row.memoryId,
      url: row.url ?? undefined,
      kind: row.kind as SourceKind,
      title: row.title ?? undefined,
      faviconUrl: row.faviconUrl ?? undefined,
      fetchedAt: row.fetchedAt ?? undefined,
      createdAt: row.createdAt,
      fileName: row.fileName ?? undefined,
      mimeType: row.mimeType ?? undefined,
      // extractedText / storagePath / byteSize stay server-side (not in the wire shape).
      ingestState: (row.ingestState as MemorySource['ingestState']) ?? null,
      ingestError: row.ingestError ?? null,
    };
  }
}
