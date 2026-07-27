import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { projectDocs, type ProjectDocInsert, type ProjectDocRow } from '../db/schema';

/** Drizzle-only data access for project docs — plain CRUD, no business rules. */
@Injectable()
export class ProjectDocsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  listByProject(projectId: string): ProjectDocRow[] {
    return this.db
      .select()
      .from(projectDocs)
      .where(eq(projectDocs.projectId, projectId))
      .orderBy(asc(projectDocs.createdAt))
      .all();
  }

  get(id: string): ProjectDocRow | undefined {
    return this.db.select().from(projectDocs).where(eq(projectDocs.id, id)).get();
  }

  create(row: ProjectDocInsert): ProjectDocRow {
    return this.db.insert(projectDocs).values(row).returning().get();
  }

  update(id: string, patch: Partial<ProjectDocInsert>): ProjectDocRow | undefined {
    return this.db.update(projectDocs).set(patch).where(eq(projectDocs.id, id)).returning().get();
  }

  remove(id: string): void {
    this.db.delete(projectDocs).where(eq(projectDocs.id, id)).run();
  }
}
