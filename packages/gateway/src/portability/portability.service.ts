import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ArchiveManifest, DomainPayload, ExportOptions } from '@midnite/shared';
import { version as appVersion } from '../../package.json';
import { ApprovalsService } from '../approvals/approvals.service';
import { CouncilsService } from '../councils/councils.service';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { getSchemaVersion } from '../db/schema-version';
import { IdeaService } from '../ideas/ideas.service';
import { MediaService } from '../media/media.service';
import { MemoriesService } from '../memories/memories.service';
import { NotesService } from '../notes/notes.service';
import { ProjectsService } from '../projects/projects.service';
import { ReposService } from '../repos/repos.service';
import { RoutinesService } from '../routines/routines.service';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { packArchive } from './lib/archive';

/** One portable domain: its archive name + an unscoped read of its full records. */
type DomainSource = { name: string; read: () => unknown[] };

/**
 * Phase 49 B — the read-across export orchestrator. Composes each domain's
 * **service** (never another module's repository — CLAUDE.md) with an *unscoped*
 * read (admin export = the whole store), assembles a versioned archive, and stamps
 * the manifest. Hydrated domain objects carry their children (a Task embeds
 * events/links/deps, a Project its sources, an Idea its messages), so those ride
 * along for free.
 *
 * **This slice** exports the secret-free *work* domains. `users`/`teams` are
 * deferred to land with Theme C's restore (their faithful export needs raw rows
 * incl. `passwordHash`, whose handling is designed together with import ordering);
 * secret-bearing domains + the passphrase re-wrap are the follow-on secrets slice.
 * Derived/volatile tables (search_index, pr_status, market_cache) are never carried
 * — they rebuild on import.
 */
@Injectable()
export class PortabilityService {
  private readonly logger = new Logger(PortabilityService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: MidniteDb,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(ReposService) private readonly repos: ReposService,
    @Inject(MemoriesService) private readonly memories: MemoriesService,
    @Inject(NotesService) private readonly notes: NotesService,
    @Inject(RoutinesService) private readonly routines: RoutinesService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(CouncilsService) private readonly councils: CouncilsService,
    @Inject(IdeaService) private readonly ideas: IdeaService,
    @Inject(ApprovalsService) private readonly approvals: ApprovalsService,
    @Inject(WorkflowsService) private readonly workflows: WorkflowsService,
  ) {}

  /** Every portable domain this slice knows how to export, in a stable order. */
  private sources(): DomainSource[] {
    return [
      { name: 'tasks', read: () => this.tasks.listTasks() },
      { name: 'projects', read: () => this.projects.listProjects() },
      { name: 'repos', read: () => this.repos.list() },
      { name: 'memories', read: () => this.memories.listMemories() },
      { name: 'notes', read: () => this.notes.listNotes() },
      { name: 'routines', read: () => this.routines.listRoutines() },
      { name: 'media', read: () => this.media.listMedia() },
      { name: 'councils', read: () => this.councils.listCouncils() },
      { name: 'ideas', read: () => this.ideas.listIdeas(undefined).ideas },
      { name: 'approvalRules', read: () => this.approvals.list() },
      // Full workflow definitions (listSummaries is thin — hydrate each by id).
      { name: 'workflows', read: () => this.workflows.listSummaries().map((s) => this.workflows.getWorkflow(s.id)) },
    ];
  }

  /** Build the archive (zip Buffer) + the manifest it carries. */
  export(options: ExportOptions): { manifest: ArchiveManifest; archive: Buffer; filename: string } {
    const requested = options.domains && options.domains.length > 0 ? new Set(options.domains) : null;
    const sources = this.sources().filter((s) => !requested || requested.has(s.name));

    const payloads: DomainPayload[] = sources.map((s) => {
      const records = s.read();
      return { domain: s.name, count: records.length, records };
    });

    const manifest: ArchiveManifest = {
      // Clamp the fail-soft -1 (unreadable journal / unstamped meta) to 0 so the
      // manifest stays schema-valid (nonnegative); 0 reads as "oldest" on import
      // (older-archive → migratable), never a hard failure.
      schemaVersion: Math.max(0, getSchemaVersion(this.db)),
      appVersion,
      createdAt: new Date().toISOString(),
      domains: payloads.map((p) => p.domain),
      // Secrets are out of scope this slice — always an excluded, secret-free archive.
      secretsMode: 'excluded',
    };

    const archive = packArchive(manifest, payloads);
    const filename = `midnite-backup-${manifest.createdAt.replace(/[:.]/g, '-')}.zip`;
    this.logger.log(
      `exported archive: ${payloads.length} domains, ${payloads.reduce((n, p) => n + p.count, 0)} records, ${archive.length} bytes`,
    );
    return { manifest, archive, filename };
  }
}
