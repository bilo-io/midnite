import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import {
  MAX_SOURCES_PER_PROJECT,
  detectSourceKind,
  type Breakdown,
  type CreateProjectRequest,
  type EnhanceDescriptionRequest,
  type Project,
  type Task,
  type UpdateProjectRequest,
} from '@midnite/shared';
import { LlmService } from '../agent/llm/llm.service';
import { collapseTilde, expandTilde } from '../fs/path-tilde';
import { MemoriesService } from '../memories/memories.service';
import { projectToIndexDoc } from '../search/lib/index-mappers';
import { SearchIndexService } from '../search/search-index.service';
import { TasksService } from '../tasks/tasks.service';
import { fetchSourceMetadata } from './lib/opengraph';
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
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(ProjectsRepository) private readonly repo: ProjectsRepository,
    @Inject(LlmService) private readonly llm: LlmService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(MemoriesService) private readonly memories: MemoriesService,
    // Optional: see NotesService — global index in prod, omitted in unit specs.
    @Optional() @Inject(SearchIndexService) private readonly searchIndex?: SearchIndexService,
  ) {}

  listProjects(): Project[] {
    return this.repo.listProjects().map((r) => this.repo.hydrate(r));
  }

  getProject(id: string): Project {
    const row = this.repo.getProject(id);
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

  async createProject(req: CreateProjectRequest): Promise<Project> {
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
      createdAt: now,
      updatedAt: now,
    });

    // Positions are assigned by staged order up front, so the parallel inserts
    // below preserve it (computing positions inside each would race to 0).
    const urls = dedupe(req.sources ?? []).slice(0, MAX_SOURCES_PER_PROJECT);
    await Promise.all(urls.map((url, i) => this.addSourceRow(id, url, i)));

    const project = this.getProject(id);
    this.searchIndex?.upsert(projectToIndexDoc(project));
    return project;
  }

  updateProject(id: string, req: UpdateProjectRequest): Project {
    this.assertExists(id);
    const now = new Date().toISOString();
    const patch: Partial<{
      name: string;
      description: string | null;
      tag: string;
      color: string;
      workDir: string | null;
      archivedAt: string | null;
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
    this.repo.updateProject(id, patch);
    const project = this.getProject(id);
    this.searchIndex?.upsert(projectToIndexDoc(project));
    return project;
  }

  deleteProject(id: string): void {
    this.assertExists(id);
    this.repo.deleteProject(id);
    this.searchIndex?.remove('project', id);
  }

  async addSource(projectId: string, url: string): Promise<Project> {
    this.assertExists(projectId);
    if (this.repo.countSources(projectId) >= MAX_SOURCES_PER_PROJECT) {
      throw new BadRequestException(
        `a project can have at most ${MAX_SOURCES_PER_PROJECT} sources`,
      );
    }
    await this.addSourceRow(projectId, url, this.repo.nextSourcePosition(projectId));
    return this.getProject(projectId);
  }

  removeSource(projectId: string, sourceId: string): Project {
    this.assertExists(projectId);
    if (!this.repo.getSource(projectId, sourceId)) {
      throw new NotFoundException(`source ${sourceId} not found`);
    }
    this.repo.deleteSource(projectId, sourceId);
    return this.getProject(projectId);
  }

  reorderSources(projectId: string, sourceIds: string[]): Project {
    this.assertExists(projectId);
    const current = this.repo.listSources(projectId).map((s) => s.id);
    if (!sameIdSet(current, sourceIds)) {
      throw new BadRequestException('reorder must list every current source exactly once');
    }
    this.repo.reorderSources(projectId, sourceIds);
    return this.getProject(projectId);
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
  createTasksFromBreakdown(projectId: string, breakdown: Breakdown, repo?: string): Task[] {
    this.assertExists(projectId);
    return this.tasks.createTasksFromBreakdown(breakdown, { projectId, repo });
  }

  private async generatePlan(project: Project): Promise<string> {
    // Sources are merged by URL in increasing precedence: the project's scoped
    // memories' sources, then the project's own sources (which win on a collision).
    const byUrl = new Map<string, { kind: string; title?: string; url: string }>();
    const scopedMemories = this.memories.listScoped(project.id);
    for (const m of scopedMemories) for (const s of m.sources) byUrl.set(s.url, s);
    for (const s of project.sources) byUrl.set(s.url, s);
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
    if (project.sources.length) {
      lines.push('', '## Sources to review');
      for (const s of project.sources) lines.push(`- [ ] Review ${s.title ?? s.url}`);
    }
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

  private async addSourceRow(projectId: string, url: string, position: number): Promise<void> {
    try {
      const now = new Date().toISOString();
      const meta = await fetchSourceMetadata(url);
      this.repo.insertSource({
        id: randomUUID(),
        projectId,
        url,
        kind: detectSourceKind(url),
        title: meta.title ?? null,
        faviconUrl: meta.faviconUrl ?? null,
        fetchedAt: now,
        createdAt: now,
        position,
      });
    } catch (err) {
      // Best-effort: a bad fetch or insert must not fail project creation.
      this.logger.warn(`failed to add source ${url}: ${String(err)}`);
    }
  }
}

function dedupe(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
}

/** True when both arrays hold the same ids, each exactly once. */
function sameIdSet(current: string[], next: string[]): boolean {
  return (
    current.length === next.length &&
    new Set(next).size === next.length &&
    next.every((id) => current.includes(id))
  );
}

// Store the work directory in `~`-form: resolve to absolute (expanding any ~ and
// making relative input absolute), then collapse the home prefix back. Empty
// input clears it (null). Keeps storage portable and consistent with the picker.
function normalizeWorkDir(input?: string): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  return collapseTilde(resolve(expandTilde(trimmed)));
}
