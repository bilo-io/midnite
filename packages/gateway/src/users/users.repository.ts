import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { User } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { users, type UserInsert, type UserRow } from '../db/schema';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: UserInsert): UserRow {
    return this.db.insert(users).values(row).returning().get();
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

  hydrate(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
