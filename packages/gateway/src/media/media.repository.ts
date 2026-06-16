import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { Media, MediaType } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { media, type MediaInsert, type MediaRow } from '../db/schema';

@Injectable()
export class MediaRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: MediaInsert): MediaRow {
    return this.db.insert(media).values(row).returning().get();
  }

  list(projectId?: string, type?: MediaType): MediaRow[] {
    const filters = [];
    if (projectId) filters.push(eq(media.projectId, projectId));
    if (type) filters.push(eq(media.type, type));
    const where = filters.length > 0 ? and(...(filters as [typeof filters[0], ...typeof filters])) : undefined;
    const q = this.db.select().from(media).orderBy(desc(media.createdAt));
    return where ? q.where(where).all() : q.all();
  }

  get(id: string): MediaRow | undefined {
    return this.db.select().from(media).where(eq(media.id, id)).get();
  }

  update(id: string, patch: Partial<MediaInsert>): MediaRow | undefined {
    return this.db.update(media).set(patch).where(eq(media.id, id)).returning().get();
  }

  delete(id: string): void {
    this.db.delete(media).where(eq(media.id, id)).run();
  }

  hydrate(row: MediaRow): Media {
    let tags: string[] = [];
    try {
      tags = JSON.parse(row.tags) as string[];
    } catch {
      // fallback for malformed stored JSON
    }
    return {
      id: row.id,
      ...(row.projectId != null ? { projectId: row.projectId } : {}),
      type: row.type as Media['type'],
      title: row.title,
      ...(row.description != null ? { description: row.description } : {}),
      filePath: row.filePath,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      ...(row.width != null ? { width: row.width } : {}),
      ...(row.height != null ? { height: row.height } : {}),
      ...(row.duration != null ? { duration: row.duration } : {}),
      ...(row.prompt != null ? { prompt: row.prompt } : {}),
      tags,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
