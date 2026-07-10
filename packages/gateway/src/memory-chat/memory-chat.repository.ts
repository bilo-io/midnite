import { Inject, Injectable, Logger } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type Database from 'better-sqlite3';
import type { MemoryChatMessage } from '@midnite/shared';
import { DB_TOKEN, SQLITE_TOKEN, type MidniteDb } from '../db/db.module';
import { memoryChatMessages, type MemoryChatMessageInsert, type MemoryChatMessageRow } from '../db/schema';
import { toFtsMatchQuery } from '../search/lib/fts-query';

/** A message to persist (the service builds ids/timestamps). */
export type NewChatMessage = {
  id: string;
  memoryId: string;
  role: MemoryChatMessage['role'];
  content: string;
  citations?: string[];
  error?: boolean;
  createdAt: string;
};

@Injectable()
export class MemoryChatRepository {
  private readonly logger = new Logger(MemoryChatRepository.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: MidniteDb,
    @Inject(SQLITE_TOKEN) private readonly sqlite: Database.Database,
  ) {}

  /** The memory's single thread, oldest first. */
  listMessages(memoryId: string): MemoryChatMessage[] {
    return this.db
      .select()
      .from(memoryChatMessages)
      .where(eq(memoryChatMessages.memoryId, memoryId))
      .orderBy(asc(memoryChatMessages.createdAt), asc(memoryChatMessages.id))
      .all()
      .map((r) => this.hydrate(r));
  }

  insertMessage(msg: NewChatMessage): MemoryChatMessage {
    const row: MemoryChatMessageInsert = {
      id: msg.id,
      memoryId: msg.memoryId,
      role: msg.role,
      content: msg.content,
      citations: msg.citations && msg.citations.length ? JSON.stringify(msg.citations) : null,
      error: msg.error ? 1 : null,
      createdAt: msg.createdAt,
    };
    return this.hydrate(this.db.insert(memoryChatMessages).values(row).returning().get());
  }

  /**
   * Rank source ids by FTS5 relevance to `question` (Decision §2 — used only to
   * trim an over-budget corpus). Builds a transient FTS5 table over the source
   * texts and orders by `bm25()`; sources that don't match the query are appended
   * in their original order (least relevant). Fail-soft: any error (or an empty
   * query) falls back to the original order. Synchronous throughout, so the
   * connection-scoped temp table never races another request.
   */
  rankSourceIdsByRelevance(question: string, sources: { id: string; text: string }[]): string[] {
    const original = sources.map((s) => s.id);
    const match = toFtsMatchQuery(question);
    if (!match || sources.length === 0) return original;

    // Bare (unqualified) name so `MATCH`/`bm25()` resolve to it; created in the
    // connection-scoped `temp` schema and dropped again within this sync call.
    const TMP = 'memory_chat_rank';
    try {
      this.sqlite.exec(`DROP TABLE IF EXISTS temp.${TMP}`); // clear any leftover from a prior failed run
      this.sqlite.exec(`CREATE VIRTUAL TABLE temp.${TMP} USING fts5(sid UNINDEXED, body)`);
      const insert = this.sqlite.prepare(`INSERT INTO ${TMP}(sid, body) VALUES (?, ?)`);
      const insertAll = this.sqlite.transaction((rows: { id: string; text: string }[]) => {
        for (const s of rows) insert.run(s.id, s.text);
      });
      insertAll(sources);
      const ranked = (
        this.sqlite
          .prepare(`SELECT sid FROM ${TMP} WHERE ${TMP} MATCH ? ORDER BY bm25(${TMP})`)
          .all(match) as { sid: string }[]
      ).map((r) => r.sid);
      this.sqlite.exec(`DROP TABLE IF EXISTS temp.${TMP}`);
      const matched = new Set(ranked);
      return [...ranked, ...original.filter((id) => !matched.has(id))];
    } catch (err) {
      this.logger.warn(`FTS relevance rank failed, using original order: ${String(err)}`);
      return original;
    }
  }

  private hydrate(row: MemoryChatMessageRow): MemoryChatMessage {
    return {
      id: row.id,
      memoryId: row.memoryId,
      role: row.role as MemoryChatMessage['role'],
      content: row.content,
      citations: row.citations ? (JSON.parse(row.citations) as string[]) : [],
      error: row.error === 1 ? true : undefined,
      createdAt: row.createdAt,
    };
  }
}
