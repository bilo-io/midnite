import { Injectable, Logger, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Idea,
  IdeaMessage,
  IdeaStatus,
  IdeaQuery,
  TeamScope,
  CreateIdeaRequest,
  UpdateIdeaRequest,
} from '@midnite/shared';
import { SearchIndexService } from '../search/search-index.service';
import { ideaToIndexDoc } from '../search/lib/index-mappers';
import { IdeaRepository } from './ideas.repository';
import { IdeaEventBus } from './idea-event-bus';

@Injectable()
export class IdeaService {
  private readonly logger = new Logger(IdeaService.name);

  constructor(
    private readonly repo: IdeaRepository,
    private readonly bus: IdeaEventBus,
    @Optional() private readonly searchIndex?: SearchIndexService,
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
    const existing = this.getIdea(id, scope);
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

  deleteIdea(id: string, scope: TeamScope): void {
    const existing = this.getIdea(id, scope);
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

  private assertAccess(idea: Idea, scope: TeamScope): void {
    const isOwner = idea.createdBy === scope.userId;
    const isTeamMember = scope.teamId != null && idea.teamId === scope.teamId;
    const isLegacy = idea.createdBy == null;
    if (!isOwner && !isTeamMember && !isLegacy) {
      throw new ForbiddenException('Access denied');
    }
  }
}
