import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  getProjectDocTemplate,
  withProjectTitle,
  type CreateProjectDocRequest,
  type Project,
  type ProjectDoc,
  type UpdateProjectDocRequest,
} from '@midnite/shared';
import { LlmService } from '../agent/llm/llm.service';
import { ProjectsService } from '../projects/projects.service';
import type { ProjectDocRow } from '../db/schema';
import { GENERIC_DOC_SYSTEM_PROMPT, templateDocSystemPrompt } from './project-docs.prompts';
import { ProjectDocsRepository } from './project-docs.repository';

const RECORD_DOC_SCHEMA = {
  type: 'object' as const,
  properties: {
    markdown: {
      type: 'string',
      description: 'The complete GitHub-Flavored Markdown document.',
    },
  },
  required: ['markdown'],
};

const DEFAULT_TAG = 'DOC';
const DEFAULT_COLOR = '#6366f1';

/**
 * Project planning documents (moved off browser localStorage). Depends
 * one-directionally on `ProjectsService` (existence check + context for
 * generation) and `LlmService` (the same direct structured-call mechanism
 * `ProjectsService.draftPlan`/`generatePlan` use — no PTY/terminal spawn).
 */
@Injectable()
export class ProjectDocsService {
  constructor(
    @Inject(ProjectDocsRepository) private readonly repo: ProjectDocsRepository,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  listDocs(projectId: string): ProjectDoc[] {
    this.projects.getProject(projectId); // 404 if missing
    return this.repo.listByProject(projectId).map((r) => this.hydrate(r));
  }

  getDoc(id: string): ProjectDoc {
    return this.hydrate(this.getRow(id));
  }

  createDoc(projectId: string, req: CreateProjectDocRequest): ProjectDoc {
    const project = this.projects.getProject(projectId); // 404 if missing
    const now = new Date().toISOString();

    let name: string;
    let tag: string;
    let color: string;
    let content: string;
    if (req.templateId) {
      const template = getProjectDocTemplate(req.templateId);
      if (!template) throw new BadRequestException(`unknown template ${req.templateId}`);
      name = req.name?.trim() || template.name;
      tag = template.tag;
      color = template.color;
      content = withProjectTitle(template.content, template.name, project.name || 'this project');
    } else {
      name = req.name?.trim() || 'Untitled document';
      tag = DEFAULT_TAG;
      color = DEFAULT_COLOR;
      content = `# ${name}\n\n`;
    }

    const row = this.repo.create({
      id: randomUUID(),
      projectId,
      templateId: req.templateId ?? null,
      name,
      tag,
      color,
      content,
      createdAt: now,
      updatedAt: now,
    });
    return this.hydrate(row);
  }

  updateDoc(id: string, patch: UpdateProjectDocRequest): ProjectDoc {
    this.getRow(id); // 404 if missing
    const dbPatch: Partial<ProjectDocRow> = { updatedAt: new Date().toISOString() };
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.content !== undefined) dbPatch.content = patch.content;
    const row = this.repo.update(id, dbPatch);
    if (!row) throw new NotFoundException(`project doc ${id} not found`);
    return this.hydrate(row);
  }

  removeDoc(id: string): void {
    this.getRow(id); // 404 if missing
    this.repo.remove(id);
  }

  async generateDoc(id: string): Promise<ProjectDoc> {
    const row = this.getRow(id);
    const project = this.projects.getProject(row.projectId);
    const now = new Date().toISOString();
    const markdown = this.llm.enabled
      ? await this.generateMarkdown(row, project)
      : this.fallbackMarkdown(row);
    const updated = this.repo.update(id, { content: markdown, updatedAt: now });
    if (!updated) throw new NotFoundException(`project doc ${id} not found`);
    return this.hydrate(updated);
  }

  private async generateMarkdown(row: ProjectDocRow, project: Project): Promise<string> {
    const template = row.templateId ? getProjectDocTemplate(row.templateId) : undefined;
    const system = template
      ? templateDocSystemPrompt(template.name, template.description)
      : GENERIC_DOC_SYSTEM_PROMPT;
    const userText = [
      `Project name: ${project.name}`,
      `Description:\n${project.description ?? '(none provided)'}`,
      project.plan ? `Existing plan:\n${project.plan}` : null,
      `Document title: ${row.name}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    let data: unknown;
    try {
      ({ data } = await this.llm.generateStructured(
        {
          model: this.llm.getPlanModel(),
          maxTokens: 4096,
          system,
          schema: RECORD_DOC_SCHEMA,
          schemaName: 'record_doc',
          schemaDescription: 'Record the complete markdown document.',
          messages: [{ role: 'user', text: userText }],
        },
        'project',
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(`AI document generation failed: ${message}`);
    }

    const input = data as { markdown?: string } | undefined;
    const markdown = input?.markdown?.trim();
    if (!markdown) throw new BadGatewayException('AI document generation did not return markdown');
    return markdown;
  }

  private fallbackMarkdown(row: ProjectDocRow): string {
    return [
      `# ${row.name}`,
      '',
      '> AI is not configured (set `ANTHROPIC_API_KEY` or run `claude` to log in), so this document could not be generated. Edit it directly, or configure AI and try again.',
    ].join('\n');
  }

  private getRow(id: string): ProjectDocRow {
    const row = this.repo.get(id);
    if (!row) throw new NotFoundException(`project doc ${id} not found`);
    return row;
  }

  private hydrate(row: ProjectDocRow): ProjectDoc {
    return {
      id: row.id,
      projectId: row.projectId,
      templateId: row.templateId ?? undefined,
      name: row.name,
      tag: row.tag,
      color: row.color,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
