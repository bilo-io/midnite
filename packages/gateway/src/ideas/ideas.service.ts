import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Idea,
  IdeaChatResponse,
  IdeaMessage,
  IdeaQuery,
  TeamScope,
  CreateIdeaRequest,
  PromoteIdeaRequest,
  PromoteIdeaResponse,
  UpdateIdeaRequest,
} from '@midnite/shared';
import { LlmService } from '../agent/llm/llm.service';
import type { LlmMessage } from '../agent/llm/llm-provider.interface';
import { ProjectsService } from '../projects/projects.service';
import { SearchIndexService } from '../search/search-index.service';
import { ideaToIndexDoc } from '../search/lib/index-mappers';
import { IdeaRepository } from './ideas.repository';
import { IdeaEventBus } from './idea-event-bus';

/** Project colour given to a project created by promoting an idea (matches the web default). */
const PROMOTED_PROJECT_COLOR = '#6366f1';
import {
  ideaChatSystemPrompt,
  IDEA_CHAT_DISABLED_REPLY,
  IDEA_CHAT_EMPTY_REPLY,
  IDEA_CHAT_ERROR_REPLY,
} from './ideas.prompts';

@Injectable()
export class IdeaService {
  private readonly logger = new Logger(IdeaService.name);

  // Explicit @Inject on every param: this runtime (tsx/esbuild) does not emit
  // `design:paramtypes`, so Nest can't infer injection tokens from the types —
  // the rest of the gateway follows the same convention.
  constructor(
    @Inject(IdeaRepository) private readonly repo: IdeaRepository,
    @Inject(IdeaEventBus) private readonly bus: IdeaEventBus,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Optional() @Inject(SearchIndexService) private readonly searchIndex?: SearchIndexService,
    @Optional() @Inject(LlmService) private readonly llm?: LlmService,
  ) {}

  createIdea(req: CreateIdeaRequest, scope: TeamScope): Idea {
    const now = new Date().toISOString();
    const idea = this.repo.create({
      id: randomUUID(),
      teamId: scope.teamId ?? null,
      createdBy: scope.userId,
      title: req.title,
      body: req.body ?? '',
      status: 'draft',
      projectId: null,
      tags: JSON.stringify(req.tags ?? []),
      createdAt: now,
      updatedAt: now,
    });
    this.searchIndex?.upsert(ideaToIndexDoc(idea));
    this.bus.emit({ type: 'idea.created', at: now, idea });
    return idea;
  }

  listIdeas(scope: TeamScope | undefined, query?: IdeaQuery): { ideas: Idea[]; total: number } {
    return this.repo.findByTeam(scope, {
      status: query?.status,
      q: query?.q,
      page: query?.page,
      limit: query?.limit,
    });
  }

  getIdea(id: string, scope: TeamScope): Idea {
    const idea = this.repo.findById(id);
    if (!idea) throw new NotFoundException(`Idea ${id} not found`);
    this.assertAccess(idea, scope);
    return idea;
  }

  updateIdea(id: string, req: UpdateIdeaRequest, scope: TeamScope): Idea {
    this.getIdea(id, scope); // access check
    const now = new Date().toISOString();
    const updated = this.repo.update(id, {
      ...(req.title !== undefined && { title: req.title }),
      ...(req.body !== undefined && { body: req.body }),
      ...(req.tags !== undefined && { tags: JSON.stringify(req.tags) }),
      ...(req.status !== undefined && { status: req.status }),
      updatedAt: now,
    });
    if (!updated) throw new NotFoundException(`Idea ${id} not found after update`);
    this.searchIndex?.upsert(ideaToIndexDoc(updated));
    this.bus.emit({ type: 'idea.updated', at: now, idea: updated });
    return updated;
  }

  /**
   * Promote an idea to a project: create a project linked back via `ideaId`, then
   * stamp the idea with `projectId` + `status: 'promoted'`. The idea is **not**
   * archived — it stays fully editable, with the project chip as the bridge. No
   * repo is linked here (a project can span many repos; repo is per-request).
   */
  async promote(id: string, req: PromoteIdeaRequest, scope: TeamScope): Promise<PromoteIdeaResponse> {
    const idea = this.getIdea(id, scope); // access check
    if (idea.projectId) {
      throw new ConflictException(`Idea ${id} is already promoted to project ${idea.projectId}`);
    }
    const project = await this.projects.createProject(
      {
        name: req.name,
        description: idea.body || undefined,
        tag: idea.tags[0] ?? 'idea',
        color: PROMOTED_PROJECT_COLOR,
        ideaId: id,
      },
      scope.userId,
      scope.teamId ?? null,
    );
    const now = new Date().toISOString();
    const updated = this.repo.update(id, {
      projectId: project.id,
      status: 'promoted',
      updatedAt: now,
    });
    if (!updated) throw new NotFoundException(`Idea ${id} not found after promote`);
    this.searchIndex?.upsert(ideaToIndexDoc(updated));
    this.bus.emit({ type: 'idea.updated', at: now, idea: updated });
    return { idea: updated, project };
  }

  deleteIdea(id: string, scope: TeamScope): void {
    this.getIdea(id, scope); // access check
    this.searchIndex?.remove('idea', id);
    this.repo.delete(id);
    this.bus.emit({ type: 'idea.deleted', at: new Date().toISOString(), id });
  }

  listMessages(ideaId: string, scope: TeamScope): IdeaMessage[] {
    this.getIdea(ideaId, scope);
    return this.repo.listMessages(ideaId);
  }

  addUserMessage(ideaId: string, content: string, scope: TeamScope): IdeaMessage {
    this.getIdea(ideaId, scope);
    return this.repo.addMessage({
      id: randomUUID(),
      ideaId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    });
  }

  addAssistantMessage(ideaId: string, content: string): IdeaMessage {
    return this.repo.addMessage({
      id: randomUUID(),
      ideaId,
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Append the user's message, generate an assistant reply via the LLM (or a
   * graceful fallback when no provider is configured), persist it, and return
   * both. The assistant reply is shaped as a paste-ready refined idea body so the
   * web "Apply to idea" action can write it back verbatim.
   */
  async chat(ideaId: string, content: string, scope: TeamScope): Promise<IdeaChatResponse> {
    const idea = this.getIdea(ideaId, scope);
    const userMessage = this.addUserMessage(ideaId, content, scope);
    const replyText = await this.generateReply(idea);
    const assistantMessage = this.addAssistantMessage(ideaId, replyText);
    return { userMessage, assistantMessage };
  }

  private async generateReply(idea: Idea): Promise<string> {
    if (!this.llm?.enabled) return IDEA_CHAT_DISABLED_REPLY;
    // History already includes the just-added user message (addUserMessage ran first).
    const messages: LlmMessage[] = this.repo
      .listMessages(idea.id)
      .map((m) => ({ role: m.role, text: m.content }));
    try {
      const res = await this.llm.generateText({
        system: ideaChatSystemPrompt(idea),
        messages,
        maxTokens: 1024,
        model: this.llm.getPlanModel(),
      });
      return res.text.trim() || IDEA_CHAT_EMPTY_REPLY;
    } catch (err) {
      this.logger.warn(`idea chat reply failed for ${idea.id}: ${(err as Error).message}`);
      return IDEA_CHAT_ERROR_REPLY;
    }
  }

  private assertAccess(idea: Idea, scope: TeamScope): void {
    const isOwner = idea.createdBy === scope.userId;
    const isTeamMember = scope.teamId != null && idea.teamId === scope.teamId;
    const isLegacy = idea.createdBy == null;
    if (!isOwner && !isTeamMember && !isLegacy) {
      throw new ForbiddenException('Access denied');
    }
  }
}
