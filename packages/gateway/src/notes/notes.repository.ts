import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { Note } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { notes, type NoteInsert, type NoteRow } from '../db/schema';

@Injectable()
export class NotesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: NoteInsert): NoteRow {
    return this.db.insert(notes).values(row).returning().get();
  }

  list(): NoteRow[] {
    return this.db.select().from(notes).orderBy(asc(notes.position), asc(notes.createdAt)).all();
  }

  get(id: string): NoteRow | undefined {
    return this.db.select().from(notes).where(eq(notes.id, id)).get();
  }

  update(id: string, patch: Partial<NoteInsert>): NoteRow | undefined {
    return this.db.update(notes).set(patch).where(eq(notes.id, id)).returning().get();
  }

  delete(id: string): void {
    this.db.delete(notes).where(eq(notes.id, id)).run();
  }

  /** Max position across all notes, or -1 if empty. */
  maxPosition(): number {
    const rows = this.db.select({ position: notes.position }).from(notes).all();
    return rows.reduce((max, r) => Math.max(max, r.position), -1);
  }

  hydrate(row: NoteRow): Note {
    return {
      id: row.id,
      content: row.content,
      completed: row.completed === 1,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
