import {
  Inject,
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
import { IdeaService } from '../ideas/ideas.service';
import { MemoriesService } from '../memories/memories.service';
import { NotesService } from '../notes/notes.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskEventBus } from '../tasks/task-event-bus';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { toFtsMatchQuery } from './lib/fts-query';
import {
  councilToIndexDoc,
  ideaToIndexDoc,
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
    @Inject(SearchIndexService) private readonly index: SearchIndexService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(MemoriesService) private readonly memories: MemoriesService,
    @Inject(NotesService) private readonly notes: NotesService,
    @Inject(CouncilsService) private readonly councils: CouncilsService,
    @Inject(WorkflowsService) private readonly workflows: WorkflowsService,
    @Inject(TaskEventBus) private readonly taskBus: TaskEventBus,
    @Inject(IdeaService) private readonly ideaService: IdeaService,
  ) {}

  onApplicationBootstrap(): void {
    // Tasks emit on every transition already — subscribe rather than touching the
    // central tasks.service. The other five domains call the index directly.
    this.unsubscribeTasks = this.taskBus.subscribe((event) => this.onTaskEvent(event));
    // Pre-existing data must be searchable without a manual step: backfill once
    // when a fresh migration leaves the index empty on a populated DB.
    try {
      if (this.index.count() === 0) {
        const indexed = this.reindex();
        if (indexed > 0) this.logger.log(`backfilled search index with ${indexed} entities`);
      }
    } catch (err) {
      // A backfill problem must never stop the gateway serving — new writes still
      // maintain the index, and POST /search/reindex can recover it later.
      this.logger.error(`search index backfill failed: ${String(err)}`);
    }
  }

  onModuleDestroy(): void {
    this.unsubscribeTasks?.();
  }

  search(query: SearchQuery, scope?: { teamId: string | null }): SearchResponse {
    const q = query.q.trim();
    if (q.length < MIN_SEARCH_QUERY_LENGTH) return EMPTY_SEARCH_RESPONSE;
    const match = toFtsMatchQuery(q);
    if (!match) return EMPTY_SEARCH_RESPONSE;

    const { hits, total, byType } = this.index.query(match, {
      type: query.type,
      limit: query.limit ?? DEFAULT_SEARCH_LIMIT,
      teamId: scope?.teamId,
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
    const { ideas } = this.ideaService.listIdeas(undefined, { limit: 10_000 });
    const docs: IndexDoc[] = [
      ...this.tasks.listTasks().map(taskToIndexDoc),
      ...this.projects.listProjects().map(projectToIndexDoc),
      // Content-only on backfill; the memory write-path folds in source text.
      ...this.memories.listMemories().map((m) => memoryToIndexDoc(m)),
      ...this.notes.listNotes().map(noteToIndexDoc),
      ...this.councils.listCouncils().map(councilToIndexDoc),
      ...this.workflows.listSummaries().map(workflowToIndexDoc),
      ...ideas.map(ideaToIndexDoc),
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
      case 'tasks.bulkCreated': {
        // The coalesced bulk event carries only ids — fetch each to index it.
        const docs: IndexDoc[] = [];
        for (const id of event.taskIds) {
          try {
            docs.push(taskToIndexDoc(this.tasks.getTask(id)));
          } catch {
            // A task can vanish between emit and handling — skip it (it'll be
            // (re)indexed on its next mutation) rather than dropping the batch.
          }
        }
        this.index.upsertMany(docs);
        break;
      }
    }
  }
}
