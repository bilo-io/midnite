import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_USER_PREFERENCES,
  UserPreferencesSchema,
  type PreferencesResponse,
  type UserPreferences,
} from '@midnite/shared';
import { PreferencesRepository } from './preferences.repository';

/**
 * Server-synced user preferences (Phase 43 Theme B).
 *
 * Reads re-validate the stored blob through `UserPreferencesSchema`, so a
 * corrupt or schema-drifted row degrades gracefully to defaults rather than
 * leaking a non-conforming object. Writes are a **full-object replace** with a
 * server-stamped `updatedAt` (blind last-write-wins — see the phase doc).
 */
@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private readonly repo: PreferencesRepository) {}

  /** The user's preferences (defaults when they've never saved). */
  get(userId: string): PreferencesResponse {
    const row = this.repo.find(userId);
    if (!row) return { preferences: DEFAULT_USER_PREFERENCES, updatedAt: null };
    return { preferences: this.parse(row.data), updatedAt: row.updatedAt };
  }

  /** Replace the user's preferences with `prefs`, stamping the write time. */
  save(userId: string, prefs: UserPreferences): PreferencesResponse {
    // Re-parse so the persisted blob is canonical (defaults filled, unknown
    // keys stripped) regardless of what the controller handed us.
    const canonical = UserPreferencesSchema.parse(prefs);
    const updatedAt = new Date().toISOString();
    this.repo.upsert(userId, JSON.stringify(canonical), updatedAt);
    return { preferences: canonical, updatedAt };
  }

  /** Defensive parse: a bad row degrades to defaults rather than throwing. */
  private parse(raw: string): UserPreferences {
    try {
      return UserPreferencesSchema.parse(JSON.parse(raw));
    } catch (err) {
      this.logger.warn(`stored preferences blob failed validation; using defaults: ${String(err)}`);
      return DEFAULT_USER_PREFERENCES;
    }
  }
}
