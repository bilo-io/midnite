import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import {
  type Breakdown,
  type BreakdownPreviewResponse,
  type CreateProjectRequest,
  type EnhanceDescriptionRequest,
  type Project,
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
import { projectReportFilename, projectToMarkdown } from './lib/project-report';
import { ProjectsRepository } from './projects.repository';
import {
  PROJECT_DESCRIPTION_SYSTEM_PROMPT,
  PROJECT_PLAN_SYSTEM_PROMPT,
} from './projects.prompts';

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
  constructor(
    @Inject(ProjectsRepository) private readonly repo: ProjectsRepository,
    @Inject(LlmService) private readonly llm: LlmService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(MemoriesService) private readonly memories: MemoriesService,
    @Inject(BreakdownService) private readonly breakdown: BreakdownService,
    // Optional: see NotesService — global index in prod, omitted in unit specs.
    @Optional() @Inject(SearchIndexService) private readonly searchIndex?: SearchIndexService,
    // Phase 50 D — audit project mutations. Optional so unit specs are unaffected.
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  listProjects(scope?: TeamScope): Project[] {
    const rows = this.repo.listProjects(scope);
    // One batched grouped query for the whole list (Phase 58 C) — no per-project N+1.
    const counts = this.repo.statusCountsForProjects(rows.map((r) => r.id));
    return rows.map((r) => this.repo.hydrate(r, counts.get(r.id) ?? {}));
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
      plan: null,
      planUpdatedAt: null,
      createdBy: userId ?? null,
      teamId: teamId ?? null,
      ideaId: req.ideaId ?? null,
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
      archivedAt: string | null;
      phaseDocSync: number | null;
      phaseDocSyncRepoId: string | null;
      updatedAt: string;
    }> = { updatedAt: now };
    if (req.name !== undefined) patch.name = req.name;
    if (req.description !== undefined) patch.description = req.description;
    if (req.tag !== undefined) patch.tag = req.tag;
    if (req.color !== undefined) patch.color = req.color;
    // An empty string clears the directory; normalizeWorkDir maps it to null.
    if (req.workDir !== undefined) patch.workDir = normalizeWorkDir(req.workDir);
    // Archive is a soft flag: store the timestamp when set, clear it when unset.
    if (req.archived !== undefined) patch.archivedAt = req.archived ? now : null;
    // Phase 40 Theme G: sync toggle stored as 0/1; an empty repo string clears the target.
    if (req.phaseDocSync !== undefined) patch.phaseDocSync = req.phaseDocSync ? 1 : 0;
    if (req.phaseDocSyncRepoId !== undefined)
      patch.phaseDocSyncRepoId = req.phaseDocSyncRepoId.trim() || null;
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

  async draftBreakdown(projectId: string): Promise<BreakdownPreviewResponse> {
    const project = this.getProject(projectId);
    const context = [
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : null,
      project.plan ? `Existing plan:\n${project.plan}` : null,
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
    for (const m of scopedMemories) for (const s of m.sources) byUrl.set(s.url, s);
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
