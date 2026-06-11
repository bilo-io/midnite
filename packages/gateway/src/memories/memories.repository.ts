import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { Memory } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { memories, type MemoryInsert, type MemoryRow } from '../db/schema';

@Injectable()
export class MemoriesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insertMemory(row: MemoryInsert): MemoryRow {
    return this.db.insert(memories).values(row).returning().get();
  }

  listMemories(): MemoryRow[] {
    return this.db.select().from(memories).orderBy(desc(memories.updatedAt)).all();
  }

  getMemory(id: string): MemoryRow | undefined {
    return this.db.select().from(memories).where(eq(memories.id, id)).get();
  }

  updateMemory(id: string, patch: Partial<MemoryInsert>): MemoryRow | undefined {
    return this.db.update(memories).set(patch).where(eq(memories.id, id)).returning().get();
  }

  deleteMemory(id: string): void {
    this.db.delete(memories).where(eq(memories.id, id)).run();
  }

  toMemory(row: MemoryRow): Memory {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      projectId: row.projectId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
