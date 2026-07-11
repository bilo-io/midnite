import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  SECRETS_DOMAIN,
  type ArchiveManifest,
  type BackupSummary,
  type DomainPayload,
  type ExportOptions,
  type KdfParams,
  type SecretRecord,
} from '@midnite/shared';
import { version as appVersion } from '../../package.json';
import { ApprovalsService } from '../approvals/approvals.service';
import { CouncilsService } from '../councils/councils.service';
import { CryptoService } from '../crypto/crypto.service';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { getSchemaVersion } from '../db/schema-version';
import { llmSettings, teamMemberships, teams, userPreferences, users } from '../db/schema';
import { MediaService } from '../media/media.service';
import { MemoriesService } from '../memories/memories.service';
import { NotesService } from '../notes/notes.service';
import { ProjectsService } from '../projects/projects.service';
import { ReposService } from '../repos/repos.service';
import { RoutinesService } from '../routines/routines.service';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { packArchive } from './lib/archive';
import { deriveKey, newKdfParams, wrapSecret } from './lib/passphrase-crypto';
import { SECRET_DOMAINS } from './lib/secret-domains';

type Obj = Record<string, unknown>;

/** One portable domain: its archive name + an unscoped read of its full records. */
type DomainSource = { name: string; read: () => unknown[] };

/**
 * Phase 49 B — the read-across export orchestrator. Composes each domain's
 * **service** (never another module's repository — CLAUDE.md) with an *unscoped*
 * read (admin export = the whole store), assembles a versioned archive, and stamps
 * the manifest. Hydrated domain objects carry their children (a Task embeds
 * events/links/deps, a Project its sources), so those ride
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
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(ReposService) private readonly repos: ReposService,
    @Inject(MemoriesService) private readonly memories: MemoriesService,
    @Inject(NotesService) private readonly notes: NotesService,
    @Inject(RoutinesService) private readonly routines: RoutinesService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(CouncilsService) private readonly councils: CouncilsService,
    @Inject(ApprovalsService) private readonly approvals: ApprovalsService,
    @Inject(WorkflowsService) private readonly workflows: WorkflowsService,
  ) {}

  /**
   * Every portable domain, in a stable order. The work domains read through their
   * services; the Theme-G domains (users/teams/integration config) read the store
   * directly — they have no unscoped list-service, and a full-store archive is an
   * admin cross-domain read the portability module already owns (like import).
   * Secret-bearing rows carry their config here with the secret **stripped** to a
   * placeholder; the real value travels separately in the `secrets` payload.
   */
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
      { name: 'approvalRules', read: () => this.approvals.list() },
      // Full workflow definitions (listSummaries is thin — hydrate each by id).
      { name: 'workflows', read: () => this.workflows.listSummaries().map((s) => this.workflows.getWorkflow(s.id)) },
      // Theme G — auth: passwordHash rides along (bcrypt is instance-independent).
      { name: 'users', read: () => this.readUsers() },
      { name: 'teams', read: () => this.readTeams() },
      { name: 'llmSettings', read: () => this.db.select().from(llmSettings).all() },
      // Secret-bearing integration config (secret column stripped — see collectSecrets).
      ...SECRET_DOMAINS.map((d) => ({
        name: d.name,
        read: () => this.readEntitiesWithoutSecret(d.name),
      })),
    ];
  }

  /** All users, each with their synced preferences embedded (0 or 1 rows). */
  private readUsers(): Obj[] {
    const byUser = groupBy(this.db.select().from(userPreferences).all() as Obj[], 'userId');
    return (this.db.select().from(users).all() as Obj[]).map((u) => ({
      ...u,
      preferences: byUser.get(String(u['id'])) ?? [],
    }));
  }

  /** All teams, each with their memberships embedded. */
  private readTeams(): Obj[] {
    const byTeam = groupBy(this.db.select().from(teamMemberships).all() as Obj[], 'teamId');
    return (this.db.select().from(teams).all() as Obj[]).map((t) => ({
      ...t,
      memberships: byTeam.get(String(t['id'])) ?? [],
    }));
  }

  /** A secret-bearing domain's rows with the encrypted column blanked to its
   *  placeholder — the config is portable, the secret is not (it travels re-wrapped). */
  private readEntitiesWithoutSecret(name: string): Obj[] {
    const def = SECRET_DOMAINS.find((d) => d.name === name)!;
    return (this.db.select().from(def.table).all() as Obj[]).map((row) => ({
      ...row,
      [def.secretField]: def.placeholder,
    }));
  }

  /**
   * Decrypt every stored secret with the instance key and re-wrap it under the
   * passphrase-derived key for transit. A row whose secret is unset/undecryptable
   * (no instance key, corrupt) is simply omitted — you can't carry what you can't
   * read. Returns the `secrets` records + the KDF params stamped in the manifest.
   */
  private collectSecrets(passphrase: string): { records: SecretRecord[]; kdf: KdfParams } {
    const kdf = newKdfParams();
    const key = deriveKey(passphrase, kdf);
    const records: SecretRecord[] = [];
    for (const def of SECRET_DOMAINS) {
      for (const row of this.db.select().from(def.table).all() as Obj[]) {
        const stored = row[def.secretField];
        if (typeof stored !== 'string' || stored.length === 0) continue; // unset key
        const plaintext = this.crypto.decrypt(stored);
        if (plaintext === null) {
          this.logger.warn(`skipping unreadable secret ${def.name}.${def.secretField} (no instance key?)`);
          continue;
        }
        records.push({
          table: def.name,
          entityId: String(row[def.idField]),
          field: def.secretField,
          blob: wrapSecret(plaintext, key),
        });
      }
    }
    return { records, kdf };
  }

  /** Build the archive (zip Buffer) + the manifest it carries + a per-domain
   *  count summary (surfaced by the controller in a response header, Phase 49 D). */
  export(options: ExportOptions): {
    archive: Buffer;
    filename: string;
    summary: BackupSummary;
  } {
    if (options.includeSecrets && !options.passphrase) {
      throw new BadRequestException('a passphrase is required to include secrets in an export');
    }

    const requested = options.domains && options.domains.length > 0 ? new Set(options.domains) : null;
    const sources = this.sources().filter((s) => !requested || requested.has(s.name));

    const payloads: DomainPayload[] = sources.map((s) => {
      const records = s.read();
      return { domain: s.name, count: records.length, records };
    });

    // Theme G — collect + re-wrap secrets into a dedicated payload when requested.
    let kdf: KdfParams | undefined;
    if (options.includeSecrets && options.passphrase) {
      const collected = this.collectSecrets(options.passphrase);
      kdf = collected.kdf;
      payloads.push({ domain: SECRETS_DOMAIN, count: collected.records.length, records: collected.records });
    }

    const manifest: ArchiveManifest = {
      // Clamp the fail-soft -1 (unreadable journal / unstamped meta) to 0 so the
      // manifest stays schema-valid (nonnegative); 0 reads as "oldest" on import
      // (older-archive → migratable), never a hard failure.
      schemaVersion: Math.max(0, getSchemaVersion(this.db)),
      appVersion,
      createdAt: new Date().toISOString(),
      domains: payloads.map((p) => p.domain),
      secretsMode: options.includeSecrets ? 'passphrase' : 'excluded',
      ...(kdf ? { kdf } : {}),
    };

    const archive = packArchive(manifest, payloads);
    const filename = `midnite-backup-${manifest.createdAt.replace(/[:.]/g, '-')}.zip`;
    const counts = Object.fromEntries(payloads.map((p) => [p.domain, p.count]));
    this.logger.log(
      `exported archive: ${payloads.length} domains, ${payloads.reduce((n, p) => n + p.count, 0)} records, ${archive.length} bytes (secretsMode=${manifest.secretsMode})`,
    );
    return { archive, filename, summary: { ...manifest, counts } };
  }
}

/** Group rows by a string key column → Map<keyValue, rows[]>. */
function groupBy(rows: Obj[], key: string): Map<string, Obj[]> {
  const out = new Map<string, Obj[]>();
  for (const row of rows) {
    const k = String(row[key]);
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}
