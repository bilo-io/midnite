import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  type Breakdown,
  type BreakdownPreviewResponse,
  type CreateProjectRequest,
  type EnhanceDescriptionRequest,
  type InstallTerminalResponse,
  type Project,
  type ProjectsPage,
  type RepoStatusResponse,
  type RunProjectCommandRequest,
  type Task,
  type TeamScope,
  type UpdateProjectRequest,
} from '@midnite/shared';
import { BreakdownService } from '../agent/breakdown.service';
import { AuditService } from '../audit/audit.service';
import { LlmService } from '../agent/llm/llm.service';
import { collapseTilde, expandTilde } from '../fs/path-tilde';
import { MemoriesService } from '../memories/memories.service';
import { projectToIndexDoc } from '../search/lib/index-mappers';
import { SearchIndexService } from '../search/search-index.service';
import { TasksService } from '../tasks/tasks.service';
// Phase 84 D retired the forwardRef here: TerminalService's only reason to inject
// ProjectsService was session cwd resolution, which now lives in
// CwdResolverService (reaching the stored workDir via ProjectsCoreModule). The
// edge is one-way again — ProjectsService → TerminalService, for the
// Preview/Build ad-hoc terminals below.
import { TerminalService } from '../terminal/terminal.service';
import { backgroundRunSpec, buildRunInitCommand } from './lib/run-command';
import { projectReportFilename, projectToMarkdown } from './lib/project-report';
import { ProjectsRepository } from './projects.repository';
import {
  PROJECT_DESCRIPTION_SYSTEM_PROMPT,
  PROJECT_PLAN_SYSTEM_PROMPT,
} from './projects.prompts';

const execFileAsync = promisify(execFile);

const RECORD_DESCRIPTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    description: {
      type: 'string',
      description: 'The improved 2-4 sentence project description, plain prose.',
    },
  },
  required: ['description'],
};

const RECORD_PLAN_SCHEMA = {
  type: 'object' as const,
  properties: {
    markdown: {
      type: 'string',
      description:
        'The full GitHub-Flavored Markdown plan with ## section headings and - [ ] checkbox items.',
    },
  },
  required: ['markdown'],
};

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(ProjectsRepository) private readonly repo: ProjectsRepository,
    @Inject(LlmService) private readonly llm: LlmService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(MemoriesService) private readonly memories: MemoriesService,
    @Inject(BreakdownService) private readonly breakdown: BreakdownService,
    @Inject(TerminalService) private readonly terminal: TerminalService,
    // Optional: see NotesService — global index in prod, omitted in unit specs.
    @Optional() @Inject(SearchIndexService) private readonly searchIndex?: SearchIndexService,
    // Phase 50 D — audit project mutations. Optional so unit specs are unaffected.
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  /** Backward-compatible array list (search/portability/chat callers). */
  listProjects(scope?: TeamScope): Project[] {
    return this.listProjectPage(scope).items;
  }

  /**
   * A page of projects (Phase 57 C follow-up): `{ items, total }`. `page`/`limit`
   * optional — omitted returns all. Keeps the full `Project` shape.
   */
  listProjectPage(scope?: TeamScope, opts?: { page?: number; limit?: number }): ProjectsPage {
    const { rows, total } = this.repo.listProjectPage(scope, opts);
    // One batched grouped query for the whole page (Phase 58 C) — no per-project N+1.
    const counts = this.repo.statusCountsForProjects(rows.map((r) => r.id));
    const items = rows.map((r) => this.repo.hydrate(r, counts.get(r.id) ?? {}));
    return { items, total };
  }

  getProject(id: string, scope?: TeamScope): Project {
    const row = this.repo.getProject(id, scope);
    if (!row) throw new NotFoundException(`project ${id} not found`);
    return this.repo.hydrate(row);
  }

  /**
   * The configured work directory for a project, in `~`-form, or undefined if
   * the project has none (or doesn't exist). Used to resolve a session's cwd.
   */
  workDirFor(projectId: string): string | undefined {
    return this.repo.getProject(projectId)?.workDir ?? undefined;
  }

  /**
   * Preview/Launch action (project detail page): open a live ad-hoc terminal
   * that `cd`s into the project's work directory and immediately runs its
   * configured `startCommand`. 400s if either isn't set — the client hides/
   * disables the action in that case, but the server is the source of truth.
   */
  previewProject(id: string, opts?: RunProjectCommandRequest): InstallTerminalResponse {
    return this.runProjectCommand(id, 'startCommand', 'start', opts);
  }

  /** Build action (project detail page): same shape as {@link previewProject},
   *  running the project's configured `buildCommand` instead. */
  buildProject(id: string, opts?: RunProjectCommandRequest): InstallTerminalResponse {
    return this.runProjectCommand(id, 'buildCommand', 'build', opts);
  }

  private runProjectCommand(
    id: string,
    field: 'startCommand' | 'buildCommand',
    label: 'start' | 'build',
    opts?: RunProjectCommandRequest,
  ): InstallTerminalResponse {
    const project = this.getProject(id); // throws NotFound if unknown
    if (!project.workDir?.trim()) {
      throw new BadRequestException(`project ${id} has no work directory configured`);
    }
    const command = project[field]?.trim();
    if (!command) {
      throw new BadRequestException(`project ${id} has no ${label} command configured`);
    }
    const cwd = expandTilde(project.workDir, homedir());
    if (opts?.background) {
      return { terminalId: this.spawnBackgroundRun(project, label, cwd, command) };
    }
    const terminalId = this.terminal.createAdHocTerminal(buildRunInitCommand(cwd, command));
    return { terminalId };
  }

  /**
   * Background variant of a Preview/Build run: an eagerly-spawned managed-run
   * PTY (a gateway child process — killing midnite kills it; never idle-reaped,
   * it lives until the command exits). Unlike the ad-hoc path nothing has to
   * attach for the command to run, but the returned id is still attachable
   * through the normal terminal token flow if the user wants to peek at it.
   */
  private spawnBackgroundRun(
    project: Project,
    label: 'start' | 'build',
    cwd: string,
    command: string,
  ): string {
    const attachId = `project-run-${randomUUID()}`;
    const spawned = this.terminal.spawnManagedRun(attachId, backgroundRunSpec(cwd, command), {
      onData: () => {
        // Output is retained by the terminal ring buffer for late attachers;
        // nothing to capture here.
      },
      onExit: (exitCode) => {
        this.logger.log(
          `background ${label} run for project ${project.id} (${attachId}) exited with code ${exitCode}`,
        );
      },
    });
    if (!spawned.ok) {
      throw new BadRequestException(`failed to start background ${label} run: ${spawned.error}`);
    }
    this.logger.log(
      `background ${label} run for project ${project.id} started (${attachId}, pid ${spawned.pid})`,
    );
    return attachId;
  }

  /**
   * Local git status for a project's `workDir` (Phase: repo status & init — local
   * only, no remote/clone support). Never throws on a git-command failure (e.g.
   * detached HEAD, corrupt repo) — that's surfaced in `error` instead, since a
   * status probe shouldn't 500 the project detail page.
   */
  async getRepoStatus(id: string): Promise<RepoStatusResponse> {
    const project = this.getProject(id); // throws NotFound if unknown
    if (!project.workDir) return { exists: false, isRepo: false };
    const absoluteDir = expandTilde(project.workDir);

    let dirExists = false;
    try {
      dirExists = (await stat(absoluteDir)).isDirectory();
    } catch {
      dirExists = false;
    }
    if (!dirExists) return { exists: false, isRepo: false };

    return this.readRepoStatus(absoluteDir);
  }

  /**
   * `git init` a project's `workDir` if it isn't already a repo — idempotent: an
   * already-initialised repo just returns its current status unchanged. 400s if
   * `workDir` is unset or the directory doesn't exist (nothing to init).
   */
  async initRepo(id: string): Promise<RepoStatusResponse> {
    const project = this.getProject(id); // throws NotFound if unknown
    if (!project.workDir) {
      throw new BadRequestException('project has no work directory set');
    }
    const absoluteDir = expandTilde(project.workDir);

    let dirExists = false;
    try {
      dirExists = (await stat(absoluteDir)).isDirectory();
    } catch {
      dirExists = false;
    }
    if (!dirExists) {
      throw new BadRequestException(`work directory does not exist: ${project.workDir}`);
    }

    const current = await this.readRepoStatus(absoluteDir);
    if (current.isRepo) return current;

    await execFileAsync('git', ['init'], { cwd: absoluteDir });
    return this.readRepoStatus(absoluteDir);
  }

  /** Assumes `absoluteDir` exists; probes `.git` + branch/dirty state. */
  private async readRepoStatus(absoluteDir: string): Promise<RepoStatusResponse> {
    let isRepo = false;
    try {
      await stat(join(absoluteDir, '.git'));
      isRepo = true;
    } catch {
      isRepo = false;
    }
    if (!isRepo) return { exists: true, isRepo: false };

    try {
      const [{ stdout: branchOut }, { stdout: statusOut }] = await Promise.all([
        execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: absoluteDir }),
        execFileAsync('git', ['status', '--porcelain'], { cwd: absoluteDir }),
      ]);
      return {
        exists: true,
        isRepo: true,
        branch: branchOut.trim(),
        dirty: statusOut.trim().length > 0,
      };
    } catch (err) {
      return {
        exists: true,
        isRepo: true,
        error: err instanceof Error ? err.message : 'git command failed',
      };
    }
  }

  async createProject(req: CreateProjectRequest, userId?: string, teamId?: string | null): Promise<Project> {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.repo.insertProject({
      id,
      name: req.name,
      description: req.description ?? null,
      tag: req.tag,
      color: req.color,
      workDir: normalizeWorkDir(req.workDir),
      startCommand: req.startCommand?.trim() || null,
      buildCommand: req.buildCommand?.trim() || null,
      plan: null,
      planUpdatedAt: null,
      createdBy: userId ?? null,
      teamId: teamId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const project = this.getProject(id);
    this.searchIndex?.upsert(projectToIndexDoc(project));
    this.audit?.record({
      entityType: 'project',
      entityId: id,
      userId: userId ?? null,
      action: 'project.created',
      payload: { name: project.name, tag: project.tag },
    });
    return project;
  }

  updateProject(id: string, req: UpdateProjectRequest, actor: string | null = null): Project {
    const before = this.getProject(id); // throws NotFound if unknown
    const now = new Date().toISOString();
    const patch: Partial<{
      name: string;
      description: string | null;
      tag: string;
      color: string;
      workDir: string | null;
      startCommand: string | null;
      buildCommand: string | null;
      archivedAt: string | null;
      updatedAt: string;
    }> = { updatedAt: now };
    if (req.name !== undefined) patch.name = req.name;
    if (req.description !== undefined) patch.description = req.description;
    if (req.tag !== undefined) patch.tag = req.tag;
    if (req.color !== undefined) patch.color = req.color;
    // An empty string clears the directory; normalizeWorkDir maps it to null.
    if (req.workDir !== undefined) patch.workDir = normalizeWorkDir(req.workDir);
    // Empty string clears the configured command (same convention as workDir).
    if (req.startCommand !== undefined) patch.startCommand = req.startCommand.trim() || null;
    if (req.buildCommand !== undefined) patch.buildCommand = req.buildCommand.trim() || null;
    // Archive is a soft flag: store the timestamp when set, clear it when unset.
    if (req.archived !== undefined) patch.archivedAt = req.archived ? now : null;
    this.repo.updateProject(id, patch);
    const project = this.getProject(id);
    this.searchIndex?.upsert(projectToIndexDoc(project));
    this.audit?.record({
      entityType: 'project',
      entityId: id,
      userId: actor,
      action: 'project.updated',
      payload: {
        before: { name: before.name, tag: before.tag, archived: before.archived ?? false },
        after: { name: project.name, tag: project.tag, archived: project.archived ?? false },
      },
    });
    return project;
  }

  deleteProject(id: string, actor: string | null = null): void {
    const before = this.getProject(id); // throws NotFound if unknown
    this.repo.deleteProject(id);
    this.searchIndex?.remove('project', id);
    this.audit?.record({
      entityType: 'project',
      entityId: id,
      userId: actor,
      action: 'project.deleted',
      payload: { name: before.name },
    });
  }

  async enhanceDescription(req: EnhanceDescriptionRequest): Promise<string> {
    if (!this.llm.enabled) return req.description.trim();
    const { data } = await this.llm.generateStructured(
      {
        model: this.llm.getActModel(),
        maxTokens: 600,
        system: PROJECT_DESCRIPTION_SYSTEM_PROMPT,
        schema: RECORD_DESCRIPTION_SCHEMA,
        schemaName: 'record_description',
        schemaDescription: 'Record the improved project description.',
        messages: [
          {
            role: 'user',
            text: `Project name: ${req.name?.trim() || '(untitled)'}\n\nDescription:\n${req.description}`,
          },
        ],
      },
      'project',
    );
    const input = data as { description?: string } | undefined;
    return input?.description?.trim() || req.description.trim();
  }

  async draftPlan(projectId: string): Promise<{ plan: string; planUpdatedAt: string }> {
    const project = this.getProject(projectId);
    const now = new Date().toISOString();
    const markdown = this.llm.enabled
      ? await this.generatePlan(project)
      : this.fallbackPlan(project);
    this.repo.updateProject(projectId, {
      plan: markdown,
      planUpdatedAt: now,
      updatedAt: now,
    });
    // The plan is part of the indexed body — keep search current on a redraft.
    this.searchIndex?.upsert(projectToIndexDoc(this.getProject(projectId)));
    return { plan: markdown, planUpdatedAt: now };
  }

  // `overview` is the draft-plan Stage 1 approved execution-plan overview
  // (drafted live in a PTY by ProjectPlanRunnerService) — woven in as extra
  // context alongside the project's own description/plan when present.
  async draftBreakdown(projectId: string, overview?: string): Promise<BreakdownPreviewResponse> {
    const project = this.getProject(projectId);
    const context = [
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : null,
      project.plan ? `Existing plan:\n${project.plan}` : null,
      overview?.trim() ? `Approved execution-plan overview:\n${overview.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');
    return this.breakdown.generate({
      goal: project.description || project.name,
      context,
      isProject: true,
    });
  }

  updatePlan(projectId: string, plan: string): Project {
    this.assertExists(projectId);
    const now = new Date().toISOString();
    this.repo.updateProject(projectId, { plan, planUpdatedAt: now, updatedAt: now });
    const project = this.getProject(projectId);
    this.searchIndex?.upsert(projectToIndexDoc(project));
    return project;
  }

  createTasksFromPlan(projectId: string, titles: string[]): Task[] {
    this.assertExists(projectId);
    return titles.map((title) => this.tasks.createForProject({ projectId, title }));
  }

  // Structured, dependency-aware creation (Phase 28 Theme B): turn a confirmed
  // `Breakdown` into the project's edge-wired board. Thin — the create-with-deps
  // mechanism (ref resolution, Phase 27 edges, cycle pruning, coalesced event)
  // lives in `TasksService`; this just scopes it to the project. The flat
  // `createTasksFromPlan` path stays for the markdown-checkbox / LLM-off flow.
  createTasksFromBreakdown(projectId: string, breakdown: Breakdown, repo?: string, milestoneId?: string): Task[] {
    this.assertExists(projectId);
    // Phase 58 F — seeding a milestone: the milestone must belong to this project
    // (repo-level check, no milestones-module dep).
    if (milestoneId) {
      const owner = this.repo.milestoneProjectId(milestoneId);
      if (owner !== projectId) {
        throw new BadRequestException(`milestone ${milestoneId} does not belong to project ${projectId}`);
      }
    }
    return this.tasks.createTasksFromBreakdown(breakdown, { projectId, repo, milestoneId });
  }

  private async generatePlan(project: Project): Promise<string> {
    // Reference sources now live on the project's scoped memories (Phase 65 F —
    // project sources retired), deduped by URL.
    const byUrl = new Map<string, { kind: string; title?: string; url: string }>();
    const scopedMemories = this.memories.listScoped(project.id);
    // Skip file sources (no URL, Phase 65 B) — only link sources merge in.
    for (const m of scopedMemories)
      for (const s of m.sources) if (s.url) byUrl.set(s.url, { kind: s.kind, title: s.title, url: s.url });
    const merged = [...byUrl.values()];
    const sourceLines = merged.length
      ? merged.map((s) => `- [${s.kind}] ${s.title ?? '(untitled)'} — ${s.url}`).join('\n')
      : '(no sources provided)';
    // Memories (global + project-scoped) are authored knowledge — inject their
    // full content so the plan reflects standing conventions and context.
    const memoryBlock = scopedMemories.length
      ? `\n\nKnowledge / memories:\n${scopedMemories
          .map((m) => `### ${m.title}\n${m.content}`)
          .join('\n\n')}`
      : '';
    const userText = `Project name: ${project.name}\n\nDescription:\n${
      project.description ?? '(none provided)'
    }\n\nReference sources:\n${sourceLines}${memoryBlock}`;

    const { data } = await this.llm.generateStructured(
      {
        model: this.llm.getPlanModel(),
        maxTokens: 4096,
        system: PROJECT_PLAN_SYSTEM_PROMPT,
        schema: RECORD_PLAN_SCHEMA,
        schemaName: 'record_plan',
        schemaDescription: 'Record the full markdown implementation plan.',
        messages: [{ role: 'user', text: userText }],
      },
      'project',
    );

    const input = data as { markdown?: string } | undefined;
    const markdown = input?.markdown?.trim();
    if (!markdown) throw new Error('plan generation did not return markdown');
    return markdown;
  }

  private fallbackPlan(project: Project): string {
    const lines = [
      `# ${project.name} — plan`,
      '',
      '> AI is not configured (set `ANTHROPIC_API_KEY` or run `claude` to log in). This is a starter template — edit it directly, then create tasks from the items you want.',
      '',
      '## Scope',
      '- [ ] Define the goals and success criteria',
      '- [ ] Break the work into milestones',
      '',
      '## Implementation',
      '- [ ] Outline the first deliverable',
      '- [ ] Identify the key files and components',
      '',
      '## Testing & rollout',
      '- [ ] Decide how to verify the work',
      '- [ ] Plan the rollout',
    ];
    return lines.join('\n');
  }

  exportMarkdown(id: string): { filename: string; markdown: string } {
    const project = this.getProject(id);
    const tasks = this.tasks.listTasks(undefined, id);
    const memories = this.memories.listScoped(id);
    return {
      filename: projectReportFilename(project),
      markdown: projectToMarkdown(project, tasks, memories),
    };
  }

  private assertExists(id: string): void {
    if (!this.repo.getProject(id)) {
      throw new NotFoundException(`project ${id} not found`);
    }
  }
}

// Store the work directory in `~`-form: resolve to absolute (expanding any ~ and
// making relative input absolute), then collapse the home prefix back. Empty
// input clears it (null). Keeps storage portable and consistent with the picker.
function normalizeWorkDir(input?: string): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  return collapseTilde(resolve(expandTilde(trimmed)));
}
