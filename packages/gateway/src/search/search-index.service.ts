import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { SearchType } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import type { IndexDoc } from './lib/index-mappers';

/** A raw match row straight from the FTS table (pre-routing). */
export type IndexHit = {
  type: SearchType;
  entityId: string;
  title: string;
  snippet: string;
  score: number;
};

/** A ranked query against the index, plus the counts the endpoint groups by. */
export type IndexQueryResult = {
  hits: IndexHit[];
  total: number;
  byType: Partial<Record<SearchType, number>>;
};

// bm25 column weights, one per FTS column (type, entity_id, title, body). The
// UNINDEXED key columns contribute nothing; title is boosted over body so a
// title hit outranks a body-only hit.
const BM25_WEIGHTS = sql`1.0, 1.0, 10.0, 1.0`;

/**
 * The low-level FTS5 gateway: keeps the unified `search_index` fresh and runs
 * ranked `MATCH` queries. No business rules, no routing — just the index.
 * Provided globally so every domain service can maintain its own rows
 * (CLAUDE.md bans triggers, so maintenance is the service write-path's job).
 */
@Injectable()
export class SearchIndexService {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  /** Replace the indexed row for one entity (delete-then-insert is the FTS upsert). */
  upsert(doc: IndexDoc): void {
    this.db.transaction((tx) => {
      tx.run(sql`DELETE FROM search_index WHERE type = ${doc.type} AND entity_id = ${doc.entityId}`);
      tx.run(
        sql`INSERT INTO search_index (type, entity_id, team_id, title, body) VALUES (${doc.type}, ${doc.entityId}, ${doc.teamId}, ${doc.title}, ${doc.body})`,
      );
    });
  }

  /** Bulk variant for backfill/reindex — one transaction for the whole batch. */
  upsertMany(docs: IndexDoc[]): void {
    if (docs.length === 0) return;
    this.db.transaction((tx) => {
      for (const doc of docs) {
        tx.run(
          sql`DELETE FROM search_index WHERE type = ${doc.type} AND entity_id = ${doc.entityId}`,
        );
        tx.run(
          sql`INSERT INTO search_index (type, entity_id, team_id, title, body) VALUES (${doc.type}, ${doc.entityId}, ${doc.teamId}, ${doc.title}, ${doc.body})`,
        );
      }
    });
  }

  remove(type: SearchType, entityId: string): void {
    this.db.run(sql`DELETE FROM search_index WHERE type = ${type} AND entity_id = ${entityId}`);
  }

  /** Drop every indexed row (used by reindex before a full repopulate). */
  clear(): void {
    this.db.run(sql`DELETE FROM search_index`);
  }

  /** Total indexed rows — drives the boot "is the index empty?" backfill check. */
  count(): number {
    return this.db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM search_index`)?.n ?? 0;
  }

  /**
   * Run a ranked match. `match` must already be a valid FTS5 expression (see
   * {@link toFtsMatchQuery}). Returns the top `limit` hits ordered by bm25 plus
   * the full match counts per type (across all matches, not just the page).
   *
   * `teamId` scopes results: rows with `team_id = teamId` OR `team_id IS NULL`
   * (personal/legacy entities visible to all). Pass `undefined` to return
   * everything (legacy unauthenticated path).
   */
  query(match: string, opts: { type?: SearchType; limit: number; teamId?: string | null }): IndexQueryResult {
    const typeClause = opts.type ? sql` AND type = ${opts.type}` : sql``;
    // When teamId is explicitly provided (including null for personal-only),
    // filter to that team + unscoped rows. Legacy/unauthenticated: no filter.
    const teamClause =
      opts.teamId !== undefined
        ? opts.teamId
          ? sql` AND (team_id IS NULL OR team_id = ${opts.teamId})`
          : sql` AND team_id IS NULL`
        : sql``;
    const hits = this.db.all<IndexHit>(sql`
      SELECT type AS type,
             entity_id AS entityId,
             title AS title,
             snippet(search_index, -1, '<mark>', '</mark>', '…', 12) AS snippet,
             -bm25(search_index, ${BM25_WEIGHTS}) AS score
      FROM search_index
      WHERE search_index MATCH ${match}${typeClause}${teamClause}
      ORDER BY bm25(search_index, ${BM25_WEIGHTS})
      LIMIT ${opts.limit}
    `);
    const counts = this.db.all<{ type: SearchType; n: number }>(sql`
      SELECT type AS type, COUNT(*) AS n
      FROM search_index
      WHERE search_index MATCH ${match}${typeClause}${teamClause}
      GROUP BY type
    `);
    const byType: Partial<Record<SearchType, number>> = {};
    let total = 0;
    for (const { type, n } of counts) {
      byType[type] = n;
      total += n;
    }
    return { hits, total, byType };
  }
}
