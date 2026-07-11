import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type { MemoryArtifact, MemoryArtifactKind } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  memoryArtifacts,
  type MemoryArtifactInsert,
  type MemoryArtifactRow,
} from '../db/schema';

@Injectable()
export class MemoryArtifactsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  list(memoryId: string): MemoryArtifactRow[] {
    return this.db
      .select()
      .from(memoryArtifacts)
      .where(eq(memoryArtifacts.memoryId, memoryId))
      .orderBy(asc(memoryArtifacts.createdAt))
      .all();
  }

  get(memoryId: string, id: string): MemoryArtifactRow | undefined {
    return this.db
      .select()
      .from(memoryArtifacts)
      .where(and(eq(memoryArtifacts.id, id), eq(memoryArtifacts.memoryId, memoryId)))
      .get();
  }

  /** The existing artifact of a given kind for a memory, if any (one per kind). */
  getByKind(memoryId: string, kind: MemoryArtifactKind): MemoryArtifactRow | undefined {
    return this.db
      .select()
      .from(memoryArtifacts)
      .where(and(eq(memoryArtifacts.memoryId, memoryId), eq(memoryArtifacts.kind, kind)))
      .get();
  }

  insert(row: MemoryArtifactInsert): MemoryArtifactRow {
    return this.db.insert(memoryArtifacts).values(row).returning().get();
  }

  update(id: string, patch: Partial<MemoryArtifactInsert>): MemoryArtifactRow | undefined {
    return this.db
      .update(memoryArtifacts)
      .set(patch)
      .where(eq(memoryArtifacts.id, id))
      .returning()
      .get();
  }

  delete(memoryId: string, id: string): void {
    this.db
      .delete(memoryArtifacts)
      .where(and(eq(memoryArtifacts.id, id), eq(memoryArtifacts.memoryId, memoryId)))
      .run();
  }

  hydrate(row: MemoryArtifactRow): MemoryArtifact {
    return {
      id: row.id,
      memoryId: row.memoryId,
      kind: row.kind as MemoryArtifact['kind'],
      format: row.format as MemoryArtifact['format'],
      title: row.title,
      content: row.content,
      status: row.status as MemoryArtifact['status'],
      error: row.error ?? null,
      filePath: row.filePath ?? null,
      mimeType: row.mimeType ?? null,
      fileSize: row.fileSize ?? null,
      degraded: row.degraded === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
