import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CouncilsService } from '../councils/councils.service';
import { MemoriesService } from '../memories/memories.service';
import { noteIndexTitle, NotesService } from '../notes/notes.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { SearchIndexService, type IndexableRow } from './search-index.service';

/**
 * Owns the index's lifecycle across the whole app (Phase 20 Theme A5): a boot
 * backfill so pre-existing rows are searchable, and an admin reindex for
 * recovery. It composes domain **services** for reads — never their repositories
 * (CLAUDE.md package boundary) — while the per-mutation maintenance lives in the
 * domain services themselves via {@link SearchIndexService}.
 *
 * The `GET /search` query path lands in Theme B; Theme A is the substrate.
 */
@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(SearchIndexService) private readonly index: SearchIndexService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(MemoriesService) private readonly memories: MemoriesService,
    @Inject(NotesService) private readonly notes: NotesService,
    @Inject(CouncilsService) private readonly councils: CouncilsService,
    @Inject(WorkflowsService) private readonly workflows: WorkflowsService,
  ) {}

  // Boot backfill (Decision §7): a freshly-migrated index is empty, so populate
  // it from existing rows — pre-existing data must be searchable without a manual
  // step. A non-empty index is left untouched; the write-path keeps it current.
  onModuleInit(): void {
    if (this.index.count() > 0) return;
    const rows = this.collectRows();
    if (rows.length === 0) return;
    this.index.indexAll(rows);
    this.logger.log(`search index backfilled ${rows.length} entities`);
  }

  // Admin reindex: rebuild from scratch (drop + repopulate). Idempotent — for
  // recovery or after a mapping change. Returns the row count for the response.
  reindex(): { indexed: number } {
    this.index.clear();
    const rows = this.collectRows();
    this.index.indexAll(rows);
    this.logger.log(`search index rebuilt (${rows.length} entities)`);
    return { indexed: rows.length };
  }

  // The denormalised text per domain, mirroring each service's write-path mapping
  // (title = name/title, body = the longer prompt/description/content field).
  private collectRows(): IndexableRow[] {
    const rows: IndexableRow[] = [];
    for (const t of this.tasks.listTasks()) {
      rows.push({ type: 'task', id: t.id, title: t.title, body: t.prompt ?? '' });
    }
    for (const p of this.projects.listProjects()) {
      rows.push({ type: 'project', id: p.id, title: p.name, body: p.description ?? '' });
    }
    for (const m of this.memories.listMemories()) {
      rows.push({ type: 'memory', id: m.id, title: m.title, body: m.content });
    }
    for (const n of this.notes.listNotes()) {
      rows.push({ type: 'note', id: n.id, title: noteIndexTitle(n.content), body: n.content });
    }
    for (const c of this.councils.listCouncils()) {
      rows.push({ type: 'council', id: c.id, title: c.name, body: c.description ?? '' });
    }
    for (const w of this.workflows.listSummaries()) {
      rows.push({ type: 'workflow', id: w.id, title: w.name, body: w.description ?? '' });
    }
    return rows;
  }
}
