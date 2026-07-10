import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { CreateProjectRequest, Idea, IdeaMessage, IdeaStatus, Project, TeamScope } from '@midnite/shared';
import type { IdeaInsert, IdeaMessageInsert } from '../db/schema';
import type { LlmService } from '../agent/llm/llm.service';
import type { ProjectsService } from '../projects/projects.service';
import { IdeaRepository } from './ideas.repository';
import { IdeaEventBus } from './idea-event-bus';
import { IdeaService } from './ideas.service';

/** Minimal fake ProjectsService — `createProject` echoes a project carrying the request's ideaId. */
function makeFakeProjects(): ProjectsService {
  return {
    createProject: vi.fn(
      async (req: CreateProjectRequest, userId?: string, teamId?: string | null): Promise<Project> => ({
        id: 'project-1',
        name: req.name,
        description: req.description,
        tag: req.tag,
        color: req.color,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        teamId: teamId ?? undefined,
        ideaId: req.ideaId ?? null,
      }),
    ),
  } as unknown as ProjectsService;
}

// ── In-memory stub ────────────────────────────────────────────────────────────

function makeIdea(insert: IdeaInsert): Idea {
  return {
    id: insert.id,
    teamId: insert.teamId ?? undefined,
    createdBy: insert.createdBy ?? undefined,
    title: insert.title,
    body: insert.body ?? '',
    status: (insert.status ?? 'draft') as IdeaStatus,
    projectId: insert.projectId ?? null,
    tags: JSON.parse(insert.tags ?? '[]'),
    createdAt: insert.createdAt,
    updatedAt: insert.updatedAt,
  };
}

function makeMessage(insert: IdeaMessageInsert): IdeaMessage {
  return {
    id: insert.id,
    ideaId: insert.ideaId,
    role: insert.role as 'user' | 'assistant',
    content: insert.content,
    createdAt: insert.createdAt,
  };
}

class InMemoryIdeaRepo extends IdeaRepository {
  private store = new Map<string, Idea>();
  private msgStore = new Map<string, IdeaMessage[]>();

  constructor() {
    super({} as never);
  }

  override create(data: IdeaInsert): Idea {
    const idea = makeIdea(data);
    this.store.set(idea.id, idea);
    return idea;
  }

  override findById(id: string): Idea | undefined {
    return this.store.get(id);
  }

  override findByTeam(
    scope: { userId: string; teamId?: string | null } | undefined,
    _opts: object,
  ): { ideas: Idea[]; total: number } {
    const all = [...this.store.values()];
    const filtered = scope
      ? all.filter(
          (i) =>
            i.createdBy === scope.userId ||
            (scope.teamId != null && i.teamId === scope.teamId) ||
            i.createdBy == null,
        )
      : all;
    return { ideas: filtered, total: filtered.length };
  }

  override update(id: string, data: Partial<IdeaInsert>): Idea | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;
    const updated: Idea = {
      ...existing,
      ...(data.title !== undefined && { title: data.title }),
      ...(data.body !== undefined && { body: data.body }),
      ...(data.status !== undefined && { status: data.status as IdeaStatus }),
      ...(data.tags !== undefined && { tags: JSON.parse(data.tags) }),
      ...(data.projectId !== undefined && { projectId: data.projectId }),
      updatedAt: data.updatedAt ?? existing.updatedAt,
    };
    this.store.set(id, updated);
    return updated;
  }

  override delete(id: string): void {
    this.store.delete(id);
    this.msgStore.delete(id);
  }

  override addMessage(data: IdeaMessageInsert): IdeaMessage {
    const msg = makeMessage(data);
    const msgs = this.msgStore.get(data.ideaId) ?? [];
    msgs.push(msg);
    this.msgStore.set(data.ideaId, msgs);
    return msg;
  }

  override listMessages(ideaId: string): IdeaMessage[] {
    return this.msgStore.get(ideaId) ?? [];
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const SCOPE: TeamScope = { userId: 'user-1', teamId: 'team-1' };
const OTHER_SCOPE: TeamScope = { userId: 'user-2', teamId: 'team-2' };

describe('IdeaService', () => {
  let service: IdeaService;
  let repo: InMemoryIdeaRepo;
  let bus: IdeaEventBus;
  let projects: ProjectsService;

  beforeEach(() => {
    repo = new InMemoryIdeaRepo();
    bus = new IdeaEventBus();
    projects = makeFakeProjects();
    service = new IdeaService(repo, bus, projects);
  });

  it('creates an idea and emits idea.created', () => {
    const emitted = vi.spyOn(bus, 'emit');
    const idea = service.createIdea({ title: 'My idea' }, SCOPE);
    expect(idea.title).toBe('My idea');
    expect(idea.status).toBe('draft');
    expect(idea.tags).toEqual([]);
    expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ type: 'idea.created' }));
  });

  it('lists ideas visible to scope', () => {
    service.createIdea({ title: 'Mine' }, SCOPE);
    service.createIdea({ title: 'Theirs' }, OTHER_SCOPE);
    const { ideas } = service.listIdeas(SCOPE);
    expect(ideas).toHaveLength(1);
    expect(ideas[0]!.title).toBe('Mine');
  });

  it('gets an idea by id', () => {
    const created = service.createIdea({ title: 'Get me' }, SCOPE);
    const found = service.getIdea(created.id, SCOPE);
    expect(found.id).toBe(created.id);
  });

  it('throws NotFoundException for unknown idea', () => {
    expect(() => service.getIdea('no-such-id', SCOPE)).toThrow(NotFoundException);
  });

  it('throws ForbiddenException when scope has no access', () => {
    const created = service.createIdea({ title: 'Private' }, SCOPE);
    expect(() => service.getIdea(created.id, OTHER_SCOPE)).toThrow(ForbiddenException);
  });

  it('updates idea title and emits idea.updated', () => {
    const emitted = vi.spyOn(bus, 'emit');
    const created = service.createIdea({ title: 'Old' }, SCOPE);
    const updated = service.updateIdea(created.id, { title: 'New' }, SCOPE);
    expect(updated.title).toBe('New');
    expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ type: 'idea.updated' }));
  });

  it('promotes idea via status update', () => {
    const created = service.createIdea({ title: 'Promote me' }, SCOPE);
    const updated = service.updateIdea(created.id, { status: 'promoted' }, SCOPE);
    expect(updated.status).toBe('promoted');
  });

  it('deletes an idea and emits idea.deleted', () => {
    const emitted = vi.spyOn(bus, 'emit');
    const created = service.createIdea({ title: 'Delete me' }, SCOPE);
    service.deleteIdea(created.id, SCOPE);
    expect(() => service.getIdea(created.id, SCOPE)).toThrow(NotFoundException);
    expect(emitted).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'idea.deleted', id: created.id }),
    );
  });

  it('adds and lists messages', () => {
    const created = service.createIdea({ title: 'Chat idea' }, SCOPE);
    service.addUserMessage(created.id, 'Hello AI', SCOPE);
    const msgs = service.listMessages(created.id, SCOPE);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.role).toBe('user');
    expect(msgs[0]!.content).toBe('Hello AI');
  });

  describe('chat', () => {
    it('falls back to the disabled reply when no LLM is configured', async () => {
      const created = service.createIdea({ title: 'No LLM' }, SCOPE);
      const { userMessage, assistantMessage } = await service.chat(created.id, 'Refine it', SCOPE);
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe('Refine it');
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.content).toContain('AI is not configured');
      // Both messages persisted, in order.
      const msgs = service.listMessages(created.id, SCOPE);
      expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant']);
    });

    it('uses the LLM reply and forwards system prompt + full history when enabled', async () => {
      const generateText = vi.fn().mockResolvedValue({ text: '  A refined idea body  ', model: 'm' });
      const llm = {
        enabled: true,
        getPlanModel: () => 'plan-model',
        generateText,
      } as unknown as LlmService;
      service = new IdeaService(repo, bus, projects, undefined, llm);

      const created = service.createIdea({ title: 'With LLM', body: 'seed' }, SCOPE);
      const { assistantMessage } = await service.chat(created.id, 'make it sharper', SCOPE);

      expect(assistantMessage.content).toBe('A refined idea body'); // trimmed
      expect(generateText).toHaveBeenCalledTimes(1);
      const req = generateText.mock.calls[0]![0];
      expect(req.model).toBe('plan-model');
      expect(req.system).toContain('product-idea refiner');
      expect(req.system).toContain('seed'); // current body folded into the prompt
      // History passed to the model includes the just-added user message.
      expect(req.messages).toEqual([{ role: 'user', text: 'make it sharper' }]);
    });

    it('returns a graceful reply when the provider throws (never propagates)', async () => {
      const llm = {
        enabled: true,
        getPlanModel: () => 'plan-model',
        generateText: vi.fn().mockRejectedValue(new Error('boom')),
      } as unknown as LlmService;
      service = new IdeaService(repo, bus, projects, undefined, llm);

      const created = service.createIdea({ title: 'Flaky LLM' }, SCOPE);
      const { assistantMessage } = await service.chat(created.id, 'hi', SCOPE);
      expect(assistantMessage.content).toContain('couldn’t generate a reply');
    });
  });

  describe('promote', () => {
    it('creates a project linked back via ideaId and flips the idea to promoted', async () => {
      const emitted = vi.spyOn(bus, 'emit');
      const created = service.createIdea({ title: 'Ship it', body: 'the plan', tags: ['growth'] }, SCOPE);

      const { idea, project } = await service.promote(created.id, { name: 'Ship it project' }, SCOPE);

      // Project carries the back-link + sensible defaults derived from the idea.
      expect(project.ideaId).toBe(created.id);
      expect(project.name).toBe('Ship it project');
      expect(project.tag).toBe('growth'); // first idea tag
      expect(project.description).toBe('the plan');
      // Idea is now promoted and points at the project — not archived.
      expect(idea.status).toBe('promoted');
      expect(idea.projectId).toBe(project.id);
      expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ type: 'idea.updated' }));
      // createProject called with the team scope.
      expect(projects.createProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Ship it project', ideaId: created.id }),
        SCOPE.userId,
        SCOPE.teamId,
      );
    });

    it('defaults the project tag to "idea" when the idea has no tags', async () => {
      const created = service.createIdea({ title: 'Untagged' }, SCOPE);
      const { project } = await service.promote(created.id, { name: 'P' }, SCOPE);
      expect(project.tag).toBe('idea');
    });

    it('throws ConflictException when the idea is already promoted', async () => {
      const created = service.createIdea({ title: 'Twice' }, SCOPE);
      await service.promote(created.id, { name: 'First' }, SCOPE);
      await expect(service.promote(created.id, { name: 'Second' }, SCOPE)).rejects.toThrow(
        ConflictException,
      );
    });

    it('enforces scope access before promoting', async () => {
      const created = service.createIdea({ title: 'Private' }, SCOPE);
      await expect(service.promote(created.id, { name: 'Nope' }, OTHER_SCOPE)).rejects.toThrow(
        ForbiddenException,
      );
      expect(projects.createProject).not.toHaveBeenCalled();
    });
  });
});
