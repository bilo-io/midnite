import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { TeamScope } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { teamScopeFilter } from '../db/team-scope';
import { slides, type SlideDeckInsert, type SlideDeckRow } from '../db/schema';

@Injectable()
export class SlidesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insertDeck(row: SlideDeckInsert): SlideDeckRow {
    return this.db.insert(slides).values(row).returning().get();
  }

  getDeckRow(id: string, scope?: TeamScope): SlideDeckRow | undefined {
    const where = scope
      ? and(eq(slides.id, id), teamScopeFilter(slides.createdBy, slides.teamId, scope))
      : eq(slides.id, id);
    return this.db.select().from(slides).where(where).get();
  }

  listDeckRows(scope?: TeamScope): SlideDeckRow[] {
    const where = scope ? teamScopeFilter(slides.createdBy, slides.teamId, scope) : undefined;
    return this.db.select().from(slides).where(where).orderBy(desc(slides.updatedAt)).all();
  }

  updateDeck(id: string, patch: Partial<SlideDeckInsert>): SlideDeckRow | undefined {
    return this.db.update(slides).set(patch).where(eq(slides.id, id)).returning().get();
  }

  deleteDeck(id: string): void {
    this.db.delete(slides).where(eq(slides.id, id)).run();
  }
}
