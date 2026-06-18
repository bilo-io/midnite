import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { AgentPingResponse, LlmProvider, MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../../config.token';
import { ProviderCredentialsRepository } from '../provider-credentials.repository';
import type { LlmProviderRow } from '../../db/schema';
import {
  AnthropicProvider,
  resolveAnthropicAdapterCredential,
} from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';
import { OpenAiProvider } from './providers/openai.provider';
import type {
  GenerateStructuredRequest,
  GenerateTextRequest,
  LlmProviderAdapter,
  LlmStructuredResult,
  LlmTextResult,
} from './llm-provider.interface';

/**
 * Provider-agnostic front door for the gateway's own AI features. Replaces the
 * old Anthropic-only service: it builds the adapter for the *active* provider
 * (from the DB, falling back to env vars / the Claude keychain) and exposes
 * text + structured generation. Call {@link reload} after credentials or the
 * active provider change to rebuild the adapter.
 */
@Injectable()
export class LlmService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LlmService.name);
  private adapter: LlmProviderAdapter = new AnthropicProvider(null);
  private active: LlmProvider = 'anthropic';
  private actModel = '';
  private planModel = '';
  // Lazily-built adapters for non-active providers (per-node provider override).
  // Cleared on reload so credential edits take effect.
  private readonly overrides = new Map<LlmProvider, LlmProviderAdapter>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(ProviderCredentialsRepository)
    private readonly repo: ProviderCredentialsRepository,
  ) {}

  // onApplicationBootstrap (not onModuleInit) so the DB migrations in
  // DbModule.onModuleInit have already created the provider tables before the
  // first credential read.
  async onApplicationBootstrap(): Promise<void> {
    await this.reload();
  }

  /** Rebuild the active adapter from the current DB credentials + settings. */
  async reload(): Promise<void> {
    const active = this.repo.getActiveProvider();
    const row = this.repo.getProvider(active);
    this.active = active;
    this.actModel = row?.actModel || this.config.agent.act;
    this.planModel = row?.planModel || this.config.agent.plan;
    this.adapter = await this.buildAdapter(active, row);
    this.overrides.clear();
    this.logger.log(
      `LLM active provider=${active} enabled=${this.adapter.isEnabled()} act=${this.actModel} plan=${this.planModel}`,
    );
  }

  get enabled(): boolean {
    return this.adapter.isEnabled();
  }

  get activeProvider(): LlmProvider {
    return this.active;
  }

  getActModel(): string {
    return this.actModel;
  }

  getPlanModel(): string {
    return this.planModel;
  }

  generateText(req: GenerateTextRequest): Promise<LlmTextResult> {
    return this.adapter.generateText(req);
  }

  /**
   * Generate text via a specific provider (per-node override). Falls back to the
   * active provider when `provider` is undefined or already the active one.
   */
  async generateTextVia(
    provider: LlmProvider | undefined,
    req: GenerateTextRequest,
  ): Promise<LlmTextResult> {
    return (await this.adapterFor(provider)).generateText(req);
  }

  private async adapterFor(provider?: LlmProvider): Promise<LlmProviderAdapter> {
    if (!provider || provider === this.active) return this.adapter;
    const cached = this.overrides.get(provider);
    if (cached) return cached;
    const built = await this.buildAdapter(provider, this.repo.getProvider(provider));
    this.overrides.set(provider, built);
    return built;
  }

  generateStructured(req: GenerateStructuredRequest): Promise<LlmStructuredResult> {
    return this.adapter.generateStructured(req);
  }

  ping(): Promise<Omit<AgentPingResponse, 'cli'>> {
    return this.adapter.ping();
  }

  private async buildAdapter(
    provider: LlmProvider,
    row: LlmProviderRow | undefined,
  ): Promise<LlmProviderAdapter> {
    const key = row?.apiKey || undefined;
    switch (provider) {
      case 'anthropic': {
        const cred = await resolveAnthropicAdapterCredential(key, this.logger);
        return new AnthropicProvider(cred);
      }
      case 'openai':
        return new OpenAiProvider({
          id: 'openai',
          apiKey: key ?? process.env['OPENAI_API_KEY'],
          structuredMode: 'json_schema',
          keyRequired: true,
          maxTokensParam: 'max_completion_tokens',
        });
      case 'google':
        return new GoogleProvider(
          key ?? process.env['GEMINI_API_KEY'] ?? process.env['GOOGLE_API_KEY'],
        );
      case 'openai-compatible':
        return new OpenAiCompatibleProvider({
          apiKey: key ?? process.env['OPENAI_API_KEY'],
          baseURL: row?.baseUrl ?? process.env['OPENAI_BASE_URL'] ?? undefined,
        });
    }
  }
}
