import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type { TeamScope } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { repos, type RepoInsert, type RepoRow } from '../db/schema';
import { teamScopeFilter } from '../db/team-scope';

@Injectable()
export class ReposRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  list(scope?: TeamScope): RepoRow[] {
    const where = scope ? teamScopeFilter(repos.createdBy, repos.teamId, scope) : undefined;
    return this.db.select().from(repos).where(where).orderBy(asc(repos.name)).all();
  }

  getById(id: string, scope?: TeamScope): RepoRow | undefined {
    const where = scope
      ? and(eq(repos.id, id), teamScopeFilter(repos.createdBy, repos.teamId, scope))
      : eq(repos.id, id);
    return this.db.select().from(repos).where(where).get();
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
