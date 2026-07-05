import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { PrReviewDraft } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { prReviewComments, type PrReviewCommentInsert, type PrReviewCommentRow } from '../db/schema';

/** Drizzle queries for `pr_review_comments` (Phase 52 D). No business rules. */
@Injectable()
export class PrReviewCommentsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  /** A task's `draft` comments for one author, oldest-first. */
  listDrafts(taskId: string, author: string): PrReviewCommentRow[] {
    return this.db
      .select()
      .from(prReviewComments)
      .where(
        and(
          eq(prReviewComments.taskId, taskId),
          eq(prReviewComments.author, author),
          eq(prReviewComments.state, 'draft'),
        ),
      )
      .orderBy(asc(prReviewComments.createdAt))
      .all();
  }

  get(id: string): PrReviewCommentRow | undefined {
    return this.db.select().from(prReviewComments).where(eq(prReviewComments.id, id)).get();
  }

  insert(row: PrReviewCommentInsert): PrReviewCommentRow {
    return this.db.insert(prReviewComments).values(row).returning().get();
  }

  updateBody(id: string, body: string): PrReviewCommentRow | undefined {
    return this.db
      .update(prReviewComments)
      .set({ body })
      .where(eq(prReviewComments.id, id))
      .returning()
      .get();
  }

  remove(id: string): boolean {
    return (
      this.db
        .delete(prReviewComments)
        .where(eq(prReviewComments.id, id))
        .returning({ id: prReviewComments.id })
        .all().length > 0
    );
  }

  /** Flip a set of drafts to `submitted` (called after the GitHub review posts). */
  markSubmitted(ids: string[]): void {
    if (ids.length === 0) return;
    this.db.update(prReviewComments).set({ state: 'submitted' }).where(inArray(prReviewComments.id, ids)).run();
  }
}

/** Row → shared `PrReviewDraft` (narrows the free-text side/state columns). */
export function toDraft(row: PrReviewCommentRow): PrReviewDraft {
  return {
    id: row.id,
    taskId: row.taskId,
    path: row.path,
    line: row.line,
    side: row.side === 'LEFT' ? 'LEFT' : 'RIGHT',
    body: row.body,
    author: row.author,
    state: row.state === 'submitted' ? 'submitted' : 'draft',
    createdAt: row.createdAt,
  };
}
