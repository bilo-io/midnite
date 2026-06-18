import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { LLM_PROVIDER_DEFAULT, LlmProviderSchema, type LlmProvider } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { decryptSecret, encryptSecret, secretsEncryptionEnabled } from './key-cipher';
import {
  llmProviders,
  llmSettings,
  type LlmProviderInsert,
  type LlmProviderRow,
} from '../db/schema';

/** Singleton row id for the LLM settings (active provider). */
export const LLM_SETTINGS_ID = 'settings';

@Injectable()
export class ProviderCredentialsRepository {
  private readonly logger = new Logger(ProviderCredentialsRepository.name);

  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {
    if (!secretsEncryptionEnabled()) {
      this.logger.warn(
        'Provider API keys are stored unencrypted — set MIDNITE_PROVIDER_KEY to encrypt them at rest.',
      );
    }
  }

  getProvider(provider: LlmProvider): LlmProviderRow | undefined {
    const row = this.db.select().from(llmProviders).where(eq(llmProviders.provider, provider)).get();
    return row ? this.decryptRow(row) : undefined;
  }

  listProviders(): LlmProviderRow[] {
    return this.db.select().from(llmProviders).all().map((r) => this.decryptRow(r));
  }

  upsertProvider(provider: LlmProvider, patch: Partial<LlmProviderInsert>, updatedAt: string): LlmProviderRow {
    // Encrypt the key (if a string) before it ever touches disk; null/undefined
    // pass through (clear / leave-unchanged).
    const stored: Partial<LlmProviderInsert> = { ...patch };
    if (typeof stored.apiKey === 'string') stored.apiKey = encryptSecret(stored.apiKey);
    const row = this.db
      .insert(llmProviders)
      .values({ provider, updatedAt, ...stored })
      .onConflictDoUpdate({ target: llmProviders.provider, set: { ...stored, updatedAt } })
      .returning()
      .get();
    return this.decryptRow(row);
  }

  // Return the row with its api_key decrypted to plaintext; a value that can't be
  // decrypted (key missing/rotated) becomes null, so it reads as "no key".
  private decryptRow(row: LlmProviderRow): LlmProviderRow {
    if (!row.apiKey) return row;
    return { ...row, apiKey: decryptSecret(row.apiKey) };
  }

  /** Active provider off the singleton row; coalesces to the default. */
  getActiveProvider(): LlmProvider {
    const row = this.db.select().from(llmSettings).where(eq(llmSettings.id, LLM_SETTINGS_ID)).get();
    return LlmProviderSchema.catch(LLM_PROVIDER_DEFAULT).parse(row?.activeProvider);
  }

  setActiveProvider(provider: LlmProvider, updatedAt: string): void {
    this.db
      .insert(llmSettings)
      .values({ id: LLM_SETTINGS_ID, activeProvider: provider, updatedAt })
      .onConflictDoUpdate({ target: llmSettings.id, set: { activeProvider: provider, updatedAt } })
      .run();
  }
}
