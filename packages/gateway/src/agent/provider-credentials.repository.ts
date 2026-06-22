import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { LLM_PROVIDER_DEFAULT, LlmProviderSchema, type LlmProvider } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { CryptoService } from '../crypto/crypto.service';
import {
  llmProviders,
  llmSettings,
  type LlmProviderInsert,
  type LlmProviderRow,
} from '../db/schema';

/** Singleton row id for the LLM settings (active provider). */
export const LLM_SETTINGS_ID = 'settings';

@Injectable()
export class ProviderCredentialsRepository implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProviderCredentialsRepository.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: MidniteDb,
    @Inject(CryptoService) private readonly crypto: CryptoService,
  ) {
    if (!this.crypto.isEnabled()) {
      this.logger.warn(
        'Provider API keys are FAIL-CLOSED: MIDNITE_SECRET_KEY is unset, so encrypted keys are ' +
          'unusable (those providers are disabled) and new keys cannot be saved. Set a 32-byte ' +
          'hex/base64 MIDNITE_SECRET_KEY to enable provider keys at rest.',
      );
    }
  }

  // onApplicationBootstrap (not the constructor) so the store is fully
  // initialised before the one-time re-encrypt pass touches the table.
  // (Migrations run when the DB handle is built — DbFactory — before any hook.)
  onApplicationBootstrap(): void {
    this.upgradePlaintextKeys();
  }

  getProvider(provider: LlmProvider): LlmProviderRow | undefined {
    const row = this.db.select().from(llmProviders).where(eq(llmProviders.provider, provider)).get();
    return row ? this.decryptRow(row) : undefined;
  }

  listProviders(): LlmProviderRow[] {
    return this.db
      .select()
      .from(llmProviders)
      .all()
      .map((r) => this.decryptRow(r));
  }

  upsertProvider(
    provider: LlmProvider,
    patch: Partial<LlmProviderInsert>,
    updatedAt: string,
  ): LlmProviderRow {
    // Encrypt the key (if a string) before it ever touches disk. FAIL-CLOSED:
    // CryptoService.encrypt throws when no MIDNITE_SECRET_KEY is set, so a write
    // is rejected rather than silently persisting plaintext. null/undefined pass
    // through (clear / leave-unchanged).
    const stored: Partial<LlmProviderInsert> = { ...patch };
    if (typeof stored.apiKey === 'string') stored.apiKey = this.crypto.encrypt(stored.apiKey);
    const row = this.db
      .insert(llmProviders)
      .values({ provider, updatedAt, ...stored })
      .onConflictDoUpdate({ target: llmProviders.provider, set: { ...stored, updatedAt } })
      .returning()
      .get();
    return this.decryptRow(row);
  }

  // Return the row with its api_key decrypted to plaintext. A value that can't be
  // decrypted (key missing/rotated, fail-closed) becomes null → reads as "no key".
  private decryptRow(row: LlmProviderRow): LlmProviderRow {
    if (!row.apiKey) return row;
    return { ...row, apiKey: this.crypto.decrypt(row.apiKey) };
  }

  /**
   * One-time startup pass: when a secret key is configured, re-encrypt any legacy
   * plaintext api_key rows in place so the DB file no longer holds raw keys. A
   * no-op when encryption is disabled (nothing to upgrade) or every row is already
   * encrypted. Best-effort: a single bad row is logged and skipped.
   */
  private upgradePlaintextKeys(): void {
    if (!this.crypto.isEnabled()) return;
    const rows = this.db.select().from(llmProviders).all();
    let upgraded = 0;
    for (const row of rows) {
      if (!row.apiKey || !this.crypto.needsUpgrade(row.apiKey)) continue;
      try {
        const enc = this.crypto.encrypt(row.apiKey);
        this.db
          .update(llmProviders)
          .set({ apiKey: enc, updatedAt: new Date().toISOString() })
          .where(eq(llmProviders.provider, row.provider))
          .run();
        upgraded += 1;
      } catch (err) {
        this.logger.error(
          `failed to re-encrypt legacy provider key for ${row.provider}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
    if (upgraded > 0) {
      this.logger.log(`re-encrypted ${upgraded} legacy plaintext provider key(s) at rest`);
    }
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
