import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { repos, type RepoInsert, type RepoRow } from '../db/schema';

@Injectable()
export class ReposRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  list(): RepoRow[] {
    return this.db.select().from(repos).orderBy(asc(repos.name)).all();
  }

  getById(id: string): RepoRow | undefined {
    return this.db.select().from(repos).where(eq(repos.id, id)).get();
  }

  getByName(name: string): RepoRow | undefined {
    return this.db.select().from(repos).where(eq(repos.name, name)).get();
  }

  insert(row: RepoInsert): RepoRow {
    return this.db.insert(repos).values(row).returning().get();
  }

  update(id: string, patch: Partial<RepoInsert>): RepoRow | undefined {
    return this.db.update(repos).set(patch).where(eq(repos.id, id)).returning().get();
  }

  delete(id: string): void {
    this.db.delete(repos).where(eq(repos.id, id)).run();
  }
}
