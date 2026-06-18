import { Inject, Injectable } from '@nestjs/common';
import {
  LLM_PROVIDERS,
  type LlmProvider,
  type ProviderCredential,
  type ProvidersResponse,
  type UpdateProviderCredentialRequest,
} from '@midnite/shared';
import { LlmService } from '../agent/llm/llm.service';
import { ProviderCredentialsRepository } from '../agent/provider-credentials.repository';
import type { LlmProviderInsert, LlmProviderRow } from '../db/schema';

/** Env vars that supply a key when no DB key is stored (per provider). */
const ENV_KEYS: Record<LlmProvider, string[]> = {
  anthropic: ['ANTHROPIC_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  google: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  'openai-compatible': [],
};

@Injectable()
export class ProvidersService {
  constructor(
    @Inject(ProviderCredentialsRepository)
    private readonly repo: ProviderCredentialsRepository,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  list(): ProvidersResponse {
    const providers = LLM_PROVIDERS.map((p) => this.mask(p, this.repo.getProvider(p)));
    return { providers, activeProvider: this.repo.getActiveProvider() };
  }

  async updateProvider(
    provider: LlmProvider,
    req: UpdateProviderCredentialRequest,
  ): Promise<{ provider: ProviderCredential; activeProvider: LlmProvider }> {
    const patch: Partial<LlmProviderInsert> = {};
    // Omit a field to leave it unchanged; pass '' to clear it (→ null).
    if (req.apiKey !== undefined) patch.apiKey = req.apiKey === '' ? null : req.apiKey;
    if (req.baseUrl !== undefined) patch.baseUrl = req.baseUrl === '' ? null : req.baseUrl;
    if (req.planModel !== undefined) patch.planModel = req.planModel === '' ? null : req.planModel;
    if (req.actModel !== undefined) patch.actModel = req.actModel === '' ? null : req.actModel;

    const row = this.repo.upsertProvider(provider, patch, new Date().toISOString());
    // Rebuild the active adapter so a key/model/base-URL edit takes effect now.
    if (this.repo.getActiveProvider() === provider) await this.llm.reload();
    return { provider: this.mask(provider, row), activeProvider: this.repo.getActiveProvider() };
  }

  async setActiveProvider(provider: LlmProvider): Promise<ProvidersResponse> {
    this.repo.setActiveProvider(provider, new Date().toISOString());
    await this.llm.reload();
    return this.list();
  }

  /** Map a stored row to the masked, API-safe credential shape (no raw key). */
  private mask(provider: LlmProvider, row: LlmProviderRow | undefined): ProviderCredential {
    const storedKey = row?.apiKey ?? undefined;
    const envKey = ENV_KEYS[provider].some((name) => !!process.env[name]);
    return {
      provider,
      hasKey: !!storedKey || envKey,
      ...(storedKey ? { keyHint: storedKey.slice(-4) } : {}),
      ...(row?.baseUrl ? { baseUrl: row.baseUrl } : {}),
      ...(row?.planModel ? { planModel: row.planModel } : {}),
      ...(row?.actModel ? { actModel: row.actModel } : {}),
      ...(row?.updatedAt ? { updatedAt: row.updatedAt } : {}),
    };
  }
}
