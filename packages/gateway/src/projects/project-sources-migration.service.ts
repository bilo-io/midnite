import { Inject, Injectable, Logger, Optional, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Memory } from '@midnite/shared';
import { SQLITE_TOKEN } from '../db/db.module';
import { memoryToIndexDoc } from '../search/lib/index-mappers';
import { SearchIndexService } from '../search/search-index.service';

/**
 * Phase 65 F — retire project sources into memory. On boot, each project that
 * still carries `project_sources` rows gets **one** project-scoped memory
 * (auto-titled `"{Project} — knowledge"`) holding the migrated links, after which
 * the legacy `project_sources` table is dropped. Full, forward-only removal
 * (Decision §4): the parallel "project sources" concept is gone — memory is the
 * single knowledge notion.
 *
 * Why a boot service (not a SQL migration): Drizzle migrations run at DB-handle
 * construction, *before* any `onModuleInit`, so the drop can't be sequenced after
 * a data copy in a `.sql` file. Instead this one-shot service copies **then**
 * drops, all at boot. It's idempotent (skips a project whose knowledge memory
 * already exists; returns early once the table is gone) and fail-open (a failure
 * never blocks boot). It reads/drops the legacy table via the raw SQLite handle
 * because `project_sources` no longer has a Drizzle schema entry or repository.
 */
@Injectable()
export class ProjectSourcesMigrationService implements OnModuleInit {
  private readonly logger = new Logger(ProjectSourcesMigrationService.name);

  constructor(
    @Inject(SQLITE_TOKEN) private readonly sqlite: Database.Database,
    // Global search index (optional so it's absent in lightweight test graphs).
    @Optional() @Inject(SearchIndexService) private readonly searchIndex?: SearchIndexService,
  ) {}

  onModuleInit(): void {
    try {
      this.migrate();
    } catch (err) {
      // Fail-open: a migration failure must never block gateway boot.
      this.logger.error(`project-sources → memory migration failed: ${String(err)}`);
    }
  }

  private migrate(): void {
    if (!this.tableExists('project_sources')) return; // already migrated & dropped

    const rows = this.sqlite
      .prepare(
        `SELECT id, project_id, url, kind, title, favicon_url, fetched_at, created_at, position
           FROM project_sources
          ORDER BY project_id, position, created_at`,
      )
      .all() as LegacyProjectSourceRow[];

    const byProject = new Map<string, LegacyProjectSourceRow[]>();
    for (const r of rows) {
      const list = byProject.get(r.project_id) ?? [];
      list.push(r);
      byProject.set(r.project_id, list);
    }

    // Collected inside the tx, indexed after commit (search is best-effort).
    const created: Array<{ id: string; title: string; projectId: string }> = [];

    const insertMemory = this.sqlite.prepare(
      `INSERT INTO memories (id, title, content, project_id, archived_at, created_at, updated_at)
       VALUES (@id, @title, '', @projectId, NULL, @now, @now)`,
    );
    const insertSource = this.sqlite.prepare(
      `INSERT INTO memory_sources
         (id, memory_id, url, kind, title, favicon_url, fetched_at, created_at, position)
       VALUES (@id, @memoryId, @url, @kind, @title, @faviconUrl, @fetchedAt, @createdAt, @position)`,
    );
    const findExisting = this.sqlite.prepare(
      `SELECT id FROM memories WHERE project_id = ? AND title = ?`,
    );
    const findProject = this.sqlite.prepare(`SELECT name FROM projects WHERE id = ?`);

    this.sqlite.transaction(() => {
      for (const [projectId, sources] of byProject) {
        if (sources.length === 0) continue; // skip projects with no sources
        const project = findProject.get(projectId) as { name: string } | undefined;
        if (!project) continue; // orphan sources — the project is gone

        const title = `${project.name} — knowledge`;
        // Idempotency: a re-run finds the knowledge memory it created last time.
        if (findExisting.get(projectId, title)) continue;

        const memoryId = randomUUID();
        const now = new Date().toISOString();
        insertMemory.run({ id: memoryId, title, projectId, now });
        sources.forEach((s, position) => {
          insertSource.run({
            id: randomUUID(),
            memoryId,
            url: s.url,
            kind: s.kind,
            title: s.title,
            faviconUrl: s.favicon_url,
            fetchedAt: s.fetched_at,
            createdAt: s.created_at,
            position,
          });
        });
        created.push({ id: memoryId, title, projectId });
      }
      // Full removal: the legacy concept is retired.
      this.sqlite.exec(`DROP TABLE IF EXISTS project_sources`);
    })();

    for (const m of created) {
      const memory: Memory = {
        id: m.id,
        title: m.title,
        content: '',
        projectId: m.projectId,
        sources: [],
        archived: false,
        createdAt: '',
        updatedAt: '',
      };
      this.searchIndex?.upsert(memoryToIndexDoc(memory));
    }
    if (created.length) {
      this.logger.log(
        `migrated project sources → ${created.length} project-scoped ${
          created.length === 1 ? 'memory' : 'memories'
        }`,
      );
    }
  }

  private tableExists(name: string): boolean {
    return Boolean(
      this.sqlite
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
        .get(name),
    );
  }
}

/** A row of the legacy `project_sources` table (snake_case, raw SQLite read). */
type LegacyProjectSourceRow = {
  id: string;
  project_id: string;
  url: string;
  kind: string;
  title: string | null;
  favicon_url: string | null;
  fetched_at: string | null;
  created_at: string;
  position: number;
};
