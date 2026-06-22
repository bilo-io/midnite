import { Inject, Injectable } from '@nestjs/common';
import type Database from 'better-sqlite3';
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  type SearchEntityType,
} from '@midnite/shared';
import { SQLITE_TOKEN } from '../db/db.module';

/** One ranked hit from the FTS index — a `SearchResult` minus its `route`, which
 *  the `SearchService` derives from `type` + `id` (Theme B). */
export interface SearchHit {
  type: SearchEntityType;
  id: string;
  /** Title with `<mark>…</mark>` emphasis around matched terms. */
  title: string;
  /** A body excerpt around the match (falls back to the title when the body is empty). */
  snippet: string;
  /** Higher = more relevant (negated bm25, so callers can sort descending). */
  score: number;
}

/** The denormalised text indexed for one entity. */
export interface IndexableRow {
  type: SearchEntityType;
  id: string;
  title: string;
  body: string;
}

export interface SearchQueryOptions {
  type?: SearchEntityType;
  limit?: number;
}

const MARK_OPEN = '<mark>';
const MARK_CLOSE = '</mark>';
const SNIPPET_ELLIPSIS = '…';
const SNIPPET_TOKENS = 24;

// Column ordinals in the `search_index` FTS5 table (type, entity_id, title, body).
// highlight()/snippet() address columns positionally — keep in lockstep with the
// 0034 migration.
const COL_TITLE = 2;
const COL_BODY = 3;

/**
 * Low-level maintenance of the unified FTS5 `search_index` (Phase 20 Theme A).
 *
 * Drizzle can't model an FTS5 virtual table, so this works the same connection
 * with hand-written SQL via the raw better-sqlite3 handle. It is the single place
 * that touches the index: domain services call {@link upsert}/{@link remove} on
 * the write-path (CLAUDE.md bans triggers), and the `SearchService` drives the
 * boot backfill and reindex through {@link count}/{@link clear}/{@link indexAll}.
 */
@Injectable()
export class SearchIndexService {
  constructor(@Inject(SQLITE_TOKEN) private readonly sqlite: Database.Database) {}

  /** Insert-or-replace one entity's row. FTS5 has no native upsert, so delete-then-insert. */
  upsert(type: SearchEntityType, id: string, title: string, body: string): void {
    const tx = this.sqlite.transaction(() => {
      this.deleteStmt().run(type, id);
      this.insertStmt().run(type, id, title, body);
    });
    tx();
  }

  /** Drop one entity's row (idempotent — a no-op when absent). */
  remove(type: SearchEntityType, id: string): void {
    this.deleteStmt().run(type, id);
  }

  /** Rows currently indexed — used to decide whether a boot backfill is needed. */
  count(): number {
    const row = this.sqlite.prepare('SELECT count(*) AS n FROM search_index').get() as {
      n: number;
    };
    return row.n;
  }

  /** Wipe the whole index (reindex step one). */
  clear(): void {
    this.sqlite.prepare('DELETE FROM search_index').run();
  }

  /** Bulk-insert rows in one transaction — the backfill / reindex repopulate step. */
  indexAll(rows: IndexableRow[]): void {
    const insert = this.insertStmt();
    const tx = this.sqlite.transaction((batch: IndexableRow[]) => {
      for (const r of batch) insert.run(r.type, r.id, r.title, r.body);
    });
    tx(rows);
  }

  /**
   * Ranked full-text query. Returns `[]` for an effectively empty query (so a
   * stray space or punctuation never raises an FTS syntax error). `bm25()` orders
   * best-first; `score` is the negated bm25 so a higher number means more relevant.
   */
  query(q: string, opts: SearchQueryOptions = {}): SearchHit[] {
    const match = toMatchQuery(q);
    if (!match) return [];

    const limit = clampLimit(opts.limit);
    const clauses = ['search_index MATCH ?'];
    const params: unknown[] = [match];
    if (opts.type) {
      clauses.push('type = ?');
      params.push(opts.type);
    }
    params.push(limit);

    const sql = `
      SELECT
        type,
        entity_id AS id,
        highlight(search_index, ${COL_TITLE}, '${MARK_OPEN}', '${MARK_CLOSE}') AS title,
        snippet(search_index, ${COL_BODY}, '${MARK_OPEN}', '${MARK_CLOSE}', '${SNIPPET_ELLIPSIS}', ${SNIPPET_TOKENS}) AS snippet,
        -bm25(search_index) AS score
      FROM search_index
      WHERE ${clauses.join(' AND ')}
      ORDER BY bm25(search_index)
      LIMIT ?
    `;

    const rows = this.sqlite.prepare(sql).all(...params) as Array<{
      type: SearchEntityType;
      id: string;
      title: string;
      snippet: string;
      score: number;
    }>;

    return rows.map((r) => ({
      type: r.type,
      id: r.id,
      title: r.title,
      // A title-only match (empty body) yields an empty snippet — fall back to the
      // plain title so a result row is never blank.
      snippet: r.snippet.length > 0 ? r.snippet : stripMarks(r.title),
      score: r.score,
    }));
  }

  private insertStmt(): Database.Statement {
    return this.sqlite.prepare(
      'INSERT INTO search_index (type, entity_id, title, body) VALUES (?, ?, ?, ?)',
    );
  }

  private deleteStmt(): Database.Statement {
    return this.sqlite.prepare('DELETE FROM search_index WHERE type = ? AND entity_id = ?');
  }
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_SEARCH_LIMIT;
  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.trunc(limit)));
}

// Turn arbitrary user text into a safe FTS5 MATCH expression: tokenise to
// alphanumeric runs (dropping quotes/operators that would be a syntax error),
// quote each token as a phrase (which also neutralises bare keywords like
// AND/OR/NOT), and prefix-match the final token for as-you-type. Empty input
// returns '' so the caller short-circuits to no results.
function toMatchQuery(raw: string): string {
  const tokens = raw.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (tokens.length === 0) return '';
  return tokens.map((t, i) => (i === tokens.length - 1 ? `"${t}"*` : `"${t}"`)).join(' ');
}

function stripMarks(s: string): string {
  return s.split(MARK_OPEN).join('').split(MARK_CLOSE).join('');
}
