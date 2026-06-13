import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import type {
  Routine,
  RoutineGroup,
  RoutineItem,
  RoutineProgress,
  RoutineProgressSnapshot,
} from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  routineGroups,
  routineItems,
  routineProgress,
  routines,
  type RoutineGroupInsert,
  type RoutineGroupRow,
  type RoutineInsert,
  type RoutineItemInsert,
  type RoutineItemRow,
  type RoutineProgressInsert,
  type RoutineProgressRow,
  type RoutineRow,
} from '../db/schema';

@Injectable()
export class RoutinesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  // ---- Routines ----

  insertRoutine(row: RoutineInsert): RoutineRow {
    return this.db.insert(routines).values(row).returning().get();
  }

  listRoutines(): RoutineRow[] {
    return this.db.select().from(routines).orderBy(asc(routines.createdAt)).all();
  }

  getRoutine(id: string): RoutineRow | undefined {
    return this.db.select().from(routines).where(eq(routines.id, id)).get();
  }

  updateRoutine(id: string, patch: Partial<RoutineInsert>): void {
    this.db.update(routines).set(patch).where(eq(routines.id, id)).run();
  }

  deleteRoutine(id: string): void {
    this.db.transaction((tx) => {
      // Load groups to cascade-delete items
      const groups = tx.select().from(routineGroups).where(eq(routineGroups.routineId, id)).all();
      for (const g of groups) {
        tx.delete(routineItems).where(eq(routineItems.groupId, g.id)).run();
      }
      tx.delete(routineGroups).where(eq(routineGroups.routineId, id)).run();
      tx.delete(routineProgress).where(eq(routineProgress.routineId, id)).run();
      tx.delete(routines).where(eq(routines.id, id)).run();
    });
  }

  // ---- Groups ----

  insertGroup(row: RoutineGroupInsert): RoutineGroupRow {
    return this.db.insert(routineGroups).values(row).returning().get();
  }

  listGroups(routineId: string): RoutineGroupRow[] {
    return this.db
      .select()
      .from(routineGroups)
      .where(eq(routineGroups.routineId, routineId))
      .orderBy(asc(routineGroups.position), asc(routineGroups.createdAt))
      .all();
  }

  getGroup(id: string): RoutineGroupRow | undefined {
    return this.db.select().from(routineGroups).where(eq(routineGroups.id, id)).get();
  }

  updateGroup(id: string, patch: Partial<RoutineGroupInsert>): void {
    this.db.update(routineGroups).set(patch).where(eq(routineGroups.id, id)).run();
  }

  deleteGroup(id: string): void {
    this.db.transaction((tx) => {
      tx.delete(routineItems).where(eq(routineItems.groupId, id)).run();
      tx.delete(routineGroups).where(eq(routineGroups.id, id)).run();
    });
  }

  maxGroupPosition(routineId: string): number {
    const rows = this.db
      .select({ position: routineGroups.position })
      .from(routineGroups)
      .where(eq(routineGroups.routineId, routineId))
      .all();
    return rows.reduce((max, r) => Math.max(max, r.position), -1);
  }

  // ---- Items ----

  insertItem(row: RoutineItemInsert): RoutineItemRow {
    return this.db.insert(routineItems).values(row).returning().get();
  }

  listItems(groupId: string): RoutineItemRow[] {
    return this.db
      .select()
      .from(routineItems)
      .where(eq(routineItems.groupId, groupId))
      .orderBy(asc(routineItems.position), asc(routineItems.createdAt))
      .all();
  }

  getItem(id: string): RoutineItemRow | undefined {
    return this.db.select().from(routineItems).where(eq(routineItems.id, id)).get();
  }

  updateItem(id: string, patch: Partial<RoutineItemInsert>): void {
    this.db.update(routineItems).set(patch).where(eq(routineItems.id, id)).run();
  }

  deleteItem(id: string): void {
    this.db.delete(routineItems).where(eq(routineItems.id, id)).run();
  }

  maxItemPosition(groupId: string): number {
    const rows = this.db
      .select({ position: routineItems.position })
      .from(routineItems)
      .where(eq(routineItems.groupId, groupId))
      .all();
    return rows.reduce((max, r) => Math.max(max, r.position), -1);
  }

  // ---- Progress ----

  upsertProgress(row: RoutineProgressInsert): RoutineProgressRow {
    // SQLite upsert on (routineId, date) — update if exists, insert if not.
    // Conflict on primary key (id) — service always passes the existing row's id
    // when one exists, so subsequent saves update instead of inserting a duplicate.
    return this.db
      .insert(routineProgress)
      .values(row)
      .onConflictDoUpdate({
        target: [routineProgress.id],
        set: { snapshot: row.snapshot, updatedAt: row.updatedAt },
      })
      .returning()
      .get();
  }

  getProgress(routineId: string, date: string): RoutineProgressRow | undefined {
    return this.db
      .select()
      .from(routineProgress)
      .where(and(eq(routineProgress.routineId, routineId), eq(routineProgress.date, date)))
      .get();
  }

  listProgress(routineId: string, from: string, to: string): RoutineProgressRow[] {
    return this.db
      .select()
      .from(routineProgress)
      .where(and(eq(routineProgress.routineId, routineId)))
      .orderBy(desc(routineProgress.date))
      .all()
      .filter((r) => r.date >= from && r.date <= to);
  }

  // ---- Hydration ----

  hydrateItem(row: RoutineItemRow): RoutineItem {
    return {
      id: row.id,
      groupId: row.groupId,
      title: row.title,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateGroup(row: RoutineGroupRow): RoutineGroup {
    return {
      id: row.id,
      routineId: row.routineId,
      name: row.name,
      position: row.position,
      items: this.listItems(row.id).map((i) => this.hydrateItem(i)),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateRoutine(row: RoutineRow): Routine {
    return {
      id: row.id,
      name: row.name,
      groups: this.listGroups(row.id).map((g) => this.hydrateGroup(g)),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateProgress(row: RoutineProgressRow): RoutineProgress {
    const snapshot = JSON.parse(row.snapshot) as RoutineProgressSnapshot;
    return {
      id: row.id,
      routineId: row.routineId,
      date: row.date,
      snapshot,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
