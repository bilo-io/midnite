import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, like, or, sql } from 'drizzle-orm';
import type { Idea, IdeaMessage, IdeaStatus, TeamScope } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { teamScopeFilter } from '../db/team-scope';
import { ideaMessages, ideas, type IdeaInsert, type IdeaMessageInsert } from '../db/schema';

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function rowToIdea(row: {
  id: string;
  teamId: string | null;
  createdBy: string | null;
  title: string;
  body: string;
  status: string;
  projectId: string | null;
  tags: string;
  createdAt: string;
  updatedAt: string;
}): Idea {
  return {
    id: row.id,
    teamId: row.teamId ?? undefined,
    createdBy: row.createdBy ?? undefined,
    title: row.title,
    body: row.body,
    status: row.status as IdeaStatus,
    projectId: row.projectId,
    tags: parseTags(row.tags),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToMessage(row: {
  id: string;
  ideaId: string;
  role: string;
  content: string;
  createdAt: string;
}): IdeaMessage {
  return {
    id: row.id,
    ideaId: row.ideaId,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class IdeaRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  create(data: IdeaInsert): Idea {
    this.db.insert(ideas).values(data).run();
    return rowToIdea(this.db.select().from(ideas).where(eq(ideas.id, data.id)).get()!);
  }

  findById(id: string): Idea | undefined {
    const row = this.db.select().from(ideas).where(eq(ideas.id, id)).get();
    return row ? rowToIdea(row) : undefined;
  }

  findByTeam(
    scope: TeamScope | undefined,
    opts: { status?: IdeaStatus; q?: string; page?: number; limit?: number },
  ): { ideas: Idea[]; total: number } {
    const scopeFilter = scope ? teamScopeFilter(ideas.createdBy, ideas.teamId, scope) : undefined;
    const statusFilter = opts.status ? eq(ideas.status, opts.status) : undefined;
    const qFilter = opts.q
      ? or(
          like(ideas.title, `%${opts.q}%`),
          like(ideas.body, `%${opts.q}%`),
        )
      : undefined;
    const where = and(...[scopeFilter, statusFilter, qFilter].filter(Boolean));

    const limit = opts.limit ?? 20;
    const offset = ((opts.page ?? 1) - 1) * limit;

    const rows = this.db
      .select()
      .from(ideas)
      .where(where)
      .orderBy(desc(ideas.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    const [{ value: total }] = this.db
      .select({ value: count() })
      .from(ideas)
      .where(where)
      .all();

    return { ideas: rows.map(rowToIdea), total: total ?? 0 };
  }

  update(id: string, data: Partial<IdeaInsert>): Idea | undefined {
    this.db.update(ideas).set(data).where(eq(ideas.id, id)).run();
    return this.findById(id);
  }

  delete(id: string): void {
    this.db.delete(ideaMessages).where(eq(ideaMessages.ideaId, id)).run();
    this.db.delete(ideas).where(eq(ideas.id, id)).run();
  }

  addMessage(data: IdeaMessageInsert): IdeaMessage {
    this.db.insert(ideaMessages).values(data).run();
    return rowToMessage(
      this.db.select().from(ideaMessages).where(eq(ideaMessages.id, data.id)).get()!,
    );
  }

  listMessages(ideaId: string): IdeaMessage[] {
    return this.db
      .select()
      .from(ideaMessages)
      .where(eq(ideaMessages.ideaId, ideaId))
      .orderBy(asc(ideaMessages.createdAt))
      .all()
      .map(rowToMessage);
  }
}
