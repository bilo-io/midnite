import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  projectPlanRuns,
  type ProjectPlanRunInsert,
  type ProjectPlanRunRow,
} from '../db/schema';

/** Plain CRUD over `project_plan_runs` — no business rules (Drizzle only). */
@Injectable()
export class ProjectPlanRunsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  create(row: ProjectPlanRunInsert): ProjectPlanRunRow {
    return this.db.insert(projectPlanRuns).values(row).returning().get();
  }

  get(id: string): ProjectPlanRunRow | undefined {
    return this.db.select().from(projectPlanRuns).where(eq(projectPlanRuns.id, id)).get();
  }

  update(id: string, patch: Partial<ProjectPlanRunInsert>): ProjectPlanRunRow | undefined {
    return this.db
      .update(projectPlanRuns)
      .set(patch)
      .where(eq(projectPlanRuns.id, id))
      .returning()
      .get();
  }

  listByProject(projectId: string): ProjectPlanRunRow[] {
    return this.db
      .select()
      .from(projectPlanRuns)
      .where(eq(projectPlanRuns.projectId, projectId))
      .orderBy(desc(projectPlanRuns.startedAt))
      .all();
  }

  /** PTYs die with the gateway process — any run still 'running' after a restart
   *  is dead. Used by the runner's boot recovery, mirrors councils' stale-run scan. */
  listStaleRuns(): ProjectPlanRunRow[] {
    return this.db
      .select()
      .from(projectPlanRuns)
      .all()
      .filter((r) => r.status === 'running');
  }
}
