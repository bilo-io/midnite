import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import type { GithubProjectItem, GithubProjectStatusMapping } from '@midnite/shared';

import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  githubProjectItems,
  githubProjectStatusMap,
  type GithubProjectItemRow,
  type GithubProjectStatusMapRow,
} from '../db/schema';

/** What the service hands over to create a link; ids and timestamps are the repo's job. */
export type ProjectItemWrite = {
  taskId: string;
  teamId?: string;
  projectNodeId: string;
  itemNodeId: string;
  projectTitle: string;
  projectUrl: string;
  statusFieldNodeId?: string;
  statusOptionName?: string;
  itemUrl: string;
  /** A link-time read-back failure, so the card doesn't claim a fresh successful read. */
  lastError?: string;
  mappings: readonly GithubProjectStatusMapping[];
};

/**
 * Drizzle queries for the Projects v2 link and its status mapping (Phase 84 Theme E).
 *
 * The mapping lives in its own table, so **every read joins** and every write keeps the
 * two in step — the pair is only ever meaningful together, and a link returned without
 * its mapping would look like "nothing is mapped" rather than "I didn't fetch it".
 */
@Injectable()
export class GithubProjectItemsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  /** The link for `taskId`, mapping included, or undefined when unlinked. */
  getByTask(taskId: string): GithubProjectItem | undefined {
    const row = this.db
      .select()
      .from(githubProjectItems)
      .where(eq(githubProjectItems.taskId, taskId))
      .get();
    return row ? toItem(row, this.mappingsFor([row.id])) : undefined;
  }

  /** Links for several tasks at once — the board/detail views ask per page, not per row. */
  listByTasks(taskIds: readonly string[]): GithubProjectItem[] {
    if (taskIds.length === 0) return [];
    const rows = this.db
      .select()
      .from(githubProjectItems)
      .where(inArray(githubProjectItems.taskId, [...taskIds]))
      .all();
    const mappings = this.mappingsFor(rows.map((r) => r.id));
    return rows.map((r) => toItem(r, mappings));
  }

  /** Is this GitHub item already adopted by some other task? */
  findByNode(projectNodeId: string, itemNodeId: string): GithubProjectItem | undefined {
    const row = this.db
      .select()
      .from(githubProjectItems)
      .where(
        and(
          eq(githubProjectItems.projectNodeId, projectNodeId),
          eq(githubProjectItems.itemNodeId, itemNodeId),
        ),
      )
      .get();
    return row ? toItem(row, this.mappingsFor([row.id])) : undefined;
  }

  /** Create the link and its mapping together. */
  insert(write: ProjectItemWrite): GithubProjectItem {
    const now = new Date().toISOString();
    const id = randomUUID();
    const row = this.db
      .insert(githubProjectItems)
      .values({
        id,
        taskId: write.taskId,
        teamId: write.teamId ?? null,
        projectNodeId: write.projectNodeId,
        itemNodeId: write.itemNodeId,
        projectTitle: write.projectTitle,
        projectUrl: write.projectUrl,
        statusFieldNodeId: write.statusFieldNodeId ?? null,
        statusOptionName: write.statusOptionName ?? null,
        itemUrl: write.itemUrl,
        lastError: write.lastError ?? null,
        // Only a *successful* read is a sync. Stamping this when the read failed would
        // render as "no column, last read just now".
        lastSyncedAt: write.lastError ? null : now,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    this.replaceMappings(id, write.mappings);
    return toItem(row, this.mappingsFor([id]));
  }

  /**
   * Replace a link's mapping wholesale. Delete-then-insert rather than a diff: the map is
   * a fixed five-key set the UI always submits whole, and an empty array legitimately
   * means "clear it" (every push becomes a no-op).
   */
  replaceMappings(itemId: string, mappings: readonly GithubProjectStatusMapping[]): void {
    const now = new Date().toISOString();
    // **Transactional.** Delete-then-insert without one meant a rejected insert (a
    // duplicate status trips the unique `(item_id, status)` index) landed *after* the
    // delete had already succeeded — so a 500 also silently wiped the existing mapping
    // and turned every push into a no-op.
    this.db.transaction((tx) => {
      tx.delete(githubProjectStatusMap).where(eq(githubProjectStatusMap.itemId, itemId)).run();
      if (mappings.length === 0) return;
      tx.insert(githubProjectStatusMap)
        .values(
          mappings.map((m) => ({
            id: randomUUID(),
            itemId,
            status: m.status,
            optionId: m.optionId,
            optionName: m.optionName,
            createdAt: now,
          })),
        )
        .run();
    });
  }

  /** Record what a read-back or push observed. Theme F's poller is the main caller. */
  markSynced(
    id: string,
    patch: { statusOptionName?: string | null; lastError?: string | null },
  ): void {
    const now = new Date().toISOString();
    this.db
      .update(githubProjectItems)
      .set({
        ...(patch.statusOptionName !== undefined ? { statusOptionName: patch.statusOptionName } : {}),
        // `null` clears a previous failure; `undefined` leaves it alone.
        ...(patch.lastError !== undefined ? { lastError: patch.lastError } : {}),
        lastSyncedAt: now,
        updatedAt: now,
      })
      .where(eq(githubProjectItems.id, id))
      .run();
  }

  /** Drop the link (and its mapping). The GitHub item itself is deliberately untouched. */
  remove(taskId: string): boolean {
    const row = this.db
      .select({ id: githubProjectItems.id })
      .from(githubProjectItems)
      .where(eq(githubProjectItems.taskId, taskId))
      .get();
    if (!row) return false;
    // No FKs across logical domains here (CLAUDE.md), so the child rows are cleared by
    // hand — leaving them would orphan a mapping that a later link could re-adopt.
    this.db.delete(githubProjectStatusMap).where(eq(githubProjectStatusMap.itemId, row.id)).run();
    return (
      this.db.delete(githubProjectItems).where(eq(githubProjectItems.id, row.id)).run().changes > 0
    );
  }

  private mappingsFor(itemIds: readonly string[]): Map<string, GithubProjectStatusMapping[]> {
    const byItem = new Map<string, GithubProjectStatusMapping[]>();
    if (itemIds.length === 0) return byItem;
    const rows = this.db
      .select()
      .from(githubProjectStatusMap)
      .where(inArray(githubProjectStatusMap.itemId, [...itemIds]))
      .all();
    for (const row of rows) {
      const list = byItem.get(row.itemId) ?? [];
      list.push(toMapping(row));
      byItem.set(row.itemId, list);
    }
    return byItem;
  }
}

function toItem(
  row: GithubProjectItemRow,
  mappings: Map<string, GithubProjectStatusMapping[]>,
): GithubProjectItem {
  return {
    id: row.id,
    taskId: row.taskId,
    projectNodeId: row.projectNodeId,
    itemNodeId: row.itemNodeId,
    projectTitle: row.projectTitle,
    projectUrl: row.projectUrl,
    statusFieldNodeId: row.statusFieldNodeId ?? undefined,
    statusOptionName: row.statusOptionName ?? undefined,
    itemUrl: row.itemUrl,
    lastSyncedAt: row.lastSyncedAt ?? undefined,
    lastError: row.lastError ?? undefined,
    mappings: mappings.get(row.id) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMapping(row: GithubProjectStatusMapRow): GithubProjectStatusMapping {
  // The stored status is validated on write; a row that predates a status rename would
  // simply never match a live status and stays an inert no-op.
  return {
    status: row.status as GithubProjectStatusMapping['status'],
    optionId: row.optionId,
    optionName: row.optionName,
  };
}
