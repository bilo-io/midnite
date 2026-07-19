import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import type { User } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { users, type UserInsert, type UserRow } from '../db/schema';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: UserInsert): UserRow {
    return this.db.insert(users).values(row).returning().get();
  }

  /** All users, oldest first (Phase 73 D — the operator console's cross-tenant list). */
  listAll(): UserRow[] {
    return this.db.select().from(users).orderBy(asc(users.createdAt)).all();
  }

  /** Total user count (Phase 73 D — platform overview KPI). */
  count(): number {
    return this.db.select({ n: sql<number>`COUNT(*)` }).from(users).get()?.n ?? 0;
  }

  findById(id: string): UserRow | undefined {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }

  findByEmail(email: string): UserRow | undefined {
    return this.db.select().from(users).where(eq(users.email, email)).get();
  }

  updateProfile(id: string, fields: { name?: string; updatedAt: string }): UserRow | undefined {
    if (!fields.name) return this.findById(id);
    return this.db
      .update(users)
      .set({ name: fields.name, updatedAt: fields.updatedAt })
      .where(eq(users.id, id))
      .returning()
      .get();
  }

  updatePassword(id: string, passwordHash: string, updatedAt: string): void {
    this.db.update(users).set({ passwordHash, updatedAt }).where(eq(users.id, id)).run();
  }

  /** Refresh the stored SSO avatar URL (Phase 71) — used to keep it current on
   *  each SSO login. Does not bump `updatedAt` (a cosmetic sync, not a profile edit). */
  updateAvatar(id: string, avatarUrl: string): void {
    this.db.update(users).set({ avatarUrl }).where(eq(users.id, id)).run();
  }

  hydrate(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}),
    };
  }
}
