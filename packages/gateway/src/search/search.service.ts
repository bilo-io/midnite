import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  DEFAULT_SEARCH_LIMIT,
  EMPTY_SEARCH_RESPONSE,
  MIN_SEARCH_QUERY_LENGTH,
  type SearchQuery,
  type SearchResponse,
  type TaskBoardEvent,
} from '@midnite/shared';
import { CouncilsService } from '../councils/councils.service';
import { MemoriesService } from '../memories/memories.service';
import { NotesService } from '../notes/notes.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskEventBus } from '../tasks/task-event-bus';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { toFtsMatchQuery } from './lib/fts-query';
import {
  councilToIndexDoc,
  memoryToIndexDoc,
  noteToIndexDoc,
  projectToIndexDoc,
  routeFor,
  taskToIndexDoc,
  workflowToIndexDoc,
  type IndexDoc,
} from './lib/index-mappers';
import { SearchIndexService } from './search-index.service';

/**
 * The querying + index-lifecycle layer. Maps raw FTS hits into the
 * `SearchResult` contract (adding routes), backfills a fresh index on boot, and
 * keeps task rows current off the existing `TaskEventBus` — the other domains
 * maintain their own rows directly in their write-path.
 */
@Injectable()
export class SearchService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SearchService.name);
  private unsubscribeTasks?: () => void;

  constructor(
    private readonly index: SearchIndexService,
    private readonly tasks: TasksService,
    private readonly projects: ProjectsService,
    private readonly memories: MemoriesService,
    private readonly notes: NotesService,
    private readonly councils: CouncilsService,
    private readonly workflows: WorkflowsService,
    private readonly taskBus: TaskEventBus,
  ) {}

  onApplicationBootstrap(): void {
    // Tasks emit on every transition already — subscribe rather than touching the
    // central tasks.service. The other five domains call the index directly.
    this.unsubscribeTasks = this.taskBus.subscribe((event) => this.onTaskEvent(event));
    // Pre-existing data must be searchable without a manual step: backfill once
    // when a fresh migration leaves the index empty on a populated DB.
    if (this.index.count() === 0) {
      const indexed = this.reindex();
      if (indexed > 0) this.logger.log(`backfilled search index with ${indexed} entities`);
    }
  }

  onModuleDestroy(): void {
    this.unsubscribeTasks?.();
  }

  search(query: SearchQuery): SearchResponse {
    const q = query.q.trim();
    if (q.length < MIN_SEARCH_QUERY_LENGTH) return EMPTY_SEARCH_RESPONSE;
    const match = toFtsMatchQuery(q);
    if (!match) return EMPTY_SEARCH_RESPONSE;

    const { hits, total, byType } = this.index.query(match, {
      type: query.type,
      limit: query.limit ?? DEFAULT_SEARCH_LIMIT,
    });
    return {
      results: hits.map((h) => ({
        type: h.type,
        id: h.entityId,
        title: h.title,
        snippet: h.snippet,
        route: routeFor(h.type, h.entityId),
        score: h.score,
      })),
      total,
      byType,
    };
  }

  /** Rebuild the entire index from the domain services. Idempotent; returns count. */
  reindex(): number {
    const docs: IndexDoc[] = [
      ...this.tasks.listTasks().map(taskToIndexDoc),
      ...this.projects.listProjects().map(projectToIndexDoc),
      ...this.memories.listMemories().map(memoryToIndexDoc),
      ...this.notes.listNotes().map(noteToIndexDoc),
      ...this.councils.listCouncils().map(councilToIndexDoc),
      ...this.workflows.listSummaries().map(workflowToIndexDoc),
    ];
    this.index.clear();
    this.index.upsertMany(docs);
    return docs.length;
  }

  private onTaskEvent(event: TaskBoardEvent): void {
    switch (event.type) {
      case 'task.created':
      case 'task.updated':
        this.index.upsert(taskToIndexDoc(event.task));
        break;
      case 'task.deleted':
        this.index.remove('task', event.id);
        break;
      case 'tasks.bulkCreated':
        // The coalesced bulk event carries only ids — fetch each to index it.
        this.index.upsertMany(event.taskIds.map((id) => taskToIndexDoc(this.tasks.getTask(id))));
        break;
    }
  }
}
