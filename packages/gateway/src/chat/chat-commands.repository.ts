import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { TeamScope } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { teamScopeFilter } from '../db/team-scope';
import { chatCommands, type ChatCommandInsert, type ChatCommandRow } from '../db/schema';

/**
 * Drizzle-only data access for the chat-to-board command log (Phase 59 F). Each
 * row is an executed command + its revert plan; the id is the undo token. Reads
 * are team-scoped like every other domain (`teamScopeFilter`).
 */
@Injectable()
export class ChatCommandsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: ChatCommandInsert): ChatCommandRow {
    return this.db.insert(chatCommands).values(row).returning().get();
  }

  /** Look up a logged command by its undo token, team-scoped when a scope is given. */
  getById(id: string, scope?: TeamScope): ChatCommandRow | undefined {
    const where = scope
      ? and(eq(chatCommands.id, id), teamScopeFilter(chatCommands.userId, chatCommands.teamId, scope))
      : eq(chatCommands.id, id);
    return this.db.select().from(chatCommands).where(where).get();
  }

  /** Mark a command undone so it can't be reverted twice. */
  markUndone(id: string, undoneAt: string): void {
    this.db.update(chatCommands).set({ undoneAt }).where(eq(chatCommands.id, id)).run();
  }
}
