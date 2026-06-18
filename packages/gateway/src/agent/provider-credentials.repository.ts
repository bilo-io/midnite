import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { LLM_PROVIDER_DEFAULT, LlmProviderSchema, type LlmProvider } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
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
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  getProvider(provider: LlmProvider): LlmProviderRow | undefined {
    return this.db.select().from(llmProviders).where(eq(llmProviders.provider, provider)).get();
  }

  listProviders(): LlmProviderRow[] {
    return this.db.select().from(llmProviders).all();
  }

  upsertProvider(provider: LlmProvider, patch: Partial<LlmProviderInsert>, updatedAt: string): LlmProviderRow {
    return this.db
      .insert(llmProviders)
      .values({ provider, updatedAt, ...patch })
      .onConflictDoUpdate({ target: llmProviders.provider, set: { ...patch, updatedAt } })
      .returning()
      .get();
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
