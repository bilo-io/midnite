import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  EMPTY_SEARCH_RESPONSE,
  MIN_SEARCH_QUERY_LENGTH,
  emptySearchCounts,
  type SearchQuery,
  type SearchResponse,
  type SearchResult,
  type SearchType,
} from '@midnite/shared';
import { CouncilsService } from '../councils/councils.service';
import { MemoriesService } from '../memories/memories.service';
import { noteIndexTitle, NotesService } from '../notes/notes.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { SearchIndexService, type IndexableRow } from './search-index.service';

/**
 * Owns global search across the app. {@link query} (Theme B) is the ranked
 * `GET /search` read path; the boot backfill + reindex (Theme A5) keep the index
 * complete. It composes domain **services** for reads — never their repositories
 * (CLAUDE.md package boundary) — while the per-mutation maintenance lives in the
 * domain services themselves via {@link SearchIndexService}.
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

  // Ranked full-text query (Theme B). A too-short query returns the empty
  // response without touching the index. Each hit is mapped to a self-contained
  // SearchResult (denormalised title/snippet + a route), and counts are tallied
  // by type for the palette's group headers.
  query(input: SearchQuery): SearchResponse {
    const q = input.q.trim();
    if (q.length < MIN_SEARCH_QUERY_LENGTH) return EMPTY_SEARCH_RESPONSE;

    const hits = this.index.query(q, { type: input.type, limit: input.limit });
    // The hit already carries everything but the route; cast is sound because the
    // union members are structurally identical apart from the `type` discriminant.
    const results = hits.map(
      (h) => ({ ...h, route: routeFor(h.type) }) as SearchResult,
    );

    const byType = emptySearchCounts();
    for (const r of results) byType[r.type] += 1;
    return { results, total: results.length, byType };
  }

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

// Where a result of each type lives in the web app. These are the section pages
// (the app has no per-entity detail routes yet, and notes render as a dashboard
// widget rather than a `/notes` page). Deep-linking to a specific item is a
// follow-up once those routes exist — change this one map when they do.
const ROUTE_BY_TYPE: Record<SearchType, string> = {
  task: '/tasks',
  project: '/projects',
  memory: '/memory',
  note: '/dashboard',
  council: '/councils',
  workflow: '/workflows',
};

function routeFor(type: SearchType): string {
  return ROUTE_BY_TYPE[type];
}
