import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { userPreferences, type UserPreferencesRow } from '../db/schema';

/** Drizzle-only access to the per-user `user_preferences` row. */
@Injectable()
export class PreferencesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  find(userId: string): UserPreferencesRow | undefined {
    return this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .get();
  }

  /** Insert-or-replace the user's blob (full-object replace; LWW by `updatedAt`). */
  upsert(userId: string, data: string, updatedAt: string): UserPreferencesRow {
    return this.db
      .insert(userPreferences)
      .values({ userId, data, updatedAt })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { data, updatedAt },
      })
      .returning()
      .get();
  }
}
