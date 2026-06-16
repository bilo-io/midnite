import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';
import {
  MAX_SOURCES_PER_PROJECT,
  detectSourceKind,
  type CreateProjectRequest,
  type EnhanceDescriptionRequest,
  type Project,
  type Task,
  type UpdateProjectRequest,
} from '@midnite/shared';
import { AnthropicService } from '../agent/anthropic.service';
import { collapseTilde, expandTilde } from '../fs/path-tilde';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { MemoriesService } from '../memories/memories.service';
import { TasksService } from '../tasks/tasks.service';
import { fetchSourceMetadata } from './lib/opengraph';
import { ProjectsRepository } from './projects.repository';
import {
  PROJECT_DESCRIPTION_SYSTEM_PROMPT,
  PROJECT_PLAN_SYSTEM_PROMPT,
} from './projects.prompts';

const RECORD_DESCRIPTION_TOOL = {
  name: 'record_description',
  description: 'Record the improved project description.',
  input_schema: {
    type: 'object' as const,
    properties: {
      description: {
        type: 'string',
        description: 'The improved 2-4 sentence project description, plain prose.',
      },
    },
    required: ['description'],
  },
};

const RECORD_PLAN_TOOL = {
  name: 'record_plan',
  description: 'Record the full markdown implementation plan.',
  input_schema: {
    type: 'object' as const,
    properties: {
      markdown: {
        type: 'string',
        description:
          'The full GitHub-Flavored Markdown plan with ## section headings and - [ ] checkbox items.',
      },
    },
    required: ['markdown'],
  },
};

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(ProjectsRepository) private readonly repo: ProjectsRepository,
    @Inject(AnthropicService) private readonly anthropic: AnthropicService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(KnowledgeService) private readonly knowledge: KnowledgeService,
    @Inject(MemoriesService) private readonly memories: MemoriesService,
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

    return this.getProject(id);
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
    return this.getProject(id);
  }

  deleteProject(id: string): void {
    this.assertExists(id);
    this.repo.deleteProject(id);
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
    if (!this.anthropic.enabled) return req.description.trim();
    const client = this.anthropic.getClient();
    const response = await client.messages.create({
      model: this.anthropic.getActModel(),
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: PROJECT_DESCRIPTION_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [RECORD_DESCRIPTION_TOOL],
      tool_choice: { type: 'tool', name: 'record_description' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Project name: ${req.name?.trim() || '(untitled)'}\n\nDescription:\n${req.description}`,
            },
          ],
        },
      ],
    });
    const input = toolInput<{ description?: string }>(response, 'record_description');
    return input?.description?.trim() || req.description.trim();
  }

  async draftPlan(projectId: string): Promise<{ plan: string; planUpdatedAt: string }> {
    const project = this.getProject(projectId);
    const now = new Date().toISOString();
    const markdown = this.anthropic.enabled
      ? await this.generatePlan(project)
      : this.fallbackPlan(project);
    this.repo.updateProject(projectId, {
      plan: markdown,
      planUpdatedAt: now,
      updatedAt: now,
    });
    return { plan: markdown, planUpdatedAt: now };
  }

  updatePlan(projectId: string, plan: string): Project {
    this.assertExists(projectId);
    const now = new Date().toISOString();
    this.repo.updateProject(projectId, { plan, planUpdatedAt: now, updatedAt: now });
    return this.getProject(projectId);
  }

  createTasksFromPlan(projectId: string, titles: string[]): Task[] {
    this.assertExists(projectId);
    return titles.map((title) => this.tasks.createForProject({ projectId, title }));
  }

  private async generatePlan(project: Project): Promise<string> {
    const client = this.anthropic.getClient();
    // Sources are merged by URL in increasing precedence: the global knowledge
    // base, then the project's scoped memories' sources, then the project's own
    // sources (which win on a URL collision).
    const byUrl = new Map<string, { kind: string; title?: string; url: string }>();
    for (const s of this.knowledge.listSources()) byUrl.set(s.url, s);
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

    const response = await client.messages.create({
      model: this.anthropic.getPlanModel(),
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: PROJECT_PLAN_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [RECORD_PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'record_plan' },
      messages: [{ role: 'user', content: [{ type: 'text', text: userText }] }],
    });

    const input = toolInput<{ markdown?: string }>(response, 'record_plan');
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

function toolInput<T>(
  response: Anthropic.Messages.Message,
  name: string,
): T | undefined {
  const block = response.content.find(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use' && b.name === name,
  );
  return block?.input as T | undefined;
}
