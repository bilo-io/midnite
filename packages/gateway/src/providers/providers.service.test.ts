import { describe, expect, it, vi } from 'vitest';
import type { LlmProvider } from '@midnite/shared';
import type { LlmProviderInsert, LlmProviderRow } from '../db/schema';
import { ProviderCredentialsRepository } from '../agent/provider-credentials.repository';
import type { LlmService } from '../agent/llm/llm.service';
import { ProvidersService } from './providers.service';

class InMemoryRepo extends ProviderCredentialsRepository {
  rows = new Map<LlmProvider, LlmProviderRow>();
  active: LlmProvider = 'anthropic';

  constructor() {
    super({} as never);
  }

  override getProvider(p: LlmProvider): LlmProviderRow | undefined {
    return this.rows.get(p);
  }

  override listProviders(): LlmProviderRow[] {
    return [...this.rows.values()];
  }

  override upsertProvider(
    provider: LlmProvider,
    patch: Partial<LlmProviderInsert>,
    updatedAt: string,
  ): LlmProviderRow {
    const cur =
      this.rows.get(provider) ??
      ({ provider, apiKey: null, baseUrl: null, planModel: null, actModel: null, updatedAt } as LlmProviderRow);
    const next = { ...cur, ...patch, provider, updatedAt } as LlmProviderRow;
    this.rows.set(provider, next);
    return next;
  }

  override getActiveProvider(): LlmProvider {
    return this.active;
  }

  override setActiveProvider(provider: LlmProvider, _updatedAt: string): void {
    this.active = provider;
  }
}

function makeService() {
  const repo = new InMemoryRepo();
  const reload = vi.fn(async () => {});
  const llm = { reload } as unknown as LlmService;
  return { repo, reload, service: new ProvidersService(repo, llm) };
}

describe('ProvidersService', () => {
  it('stores a key but only returns it masked (hasKey + last 4)', async () => {
    const { service, repo } = makeService();
    const { provider } = await service.updateProvider('openai', { apiKey: 'sk-secret-7890' });

    expect(provider.provider).toBe('openai');
    expect(provider.hasKey).toBe(true);
    expect(provider.keyHint).toBe('7890');
    // The raw key is never serialised — only the stored row holds it.
    expect((provider as Record<string, unknown>).apiKey).toBeUndefined();
    expect(JSON.stringify(provider)).not.toContain('sk-secret-7890');
    expect(repo.getProvider('openai')?.apiKey).toBe('sk-secret-7890');
  });

  it('persists model + base URL overrides and echoes them back', async () => {
    const { service } = makeService();
    const { provider } = await service.updateProvider('openai-compatible', {
      baseUrl: 'http://localhost:11434/v1',
      actModel: 'llama3.1',
      planModel: 'llama3.1:70b',
    });
    expect(provider.baseUrl).toBe('http://localhost:11434/v1');
    expect(provider.actModel).toBe('llama3.1');
    expect(provider.planModel).toBe('llama3.1:70b');
  });

  it('clears a key when sent an empty string', async () => {
    const { service, repo } = makeService();
    await service.updateProvider('openai', { apiKey: 'sk-secret-7890' });
    const { provider } = await service.updateProvider('openai', { apiKey: '' });
    expect(provider.hasKey).toBe(false);
    expect(repo.getProvider('openai')?.apiKey).toBeNull();
  });

  it('reloads the LlmService when the active provider is edited', async () => {
    const { service, reload } = makeService(); // active = anthropic
    await service.updateProvider('openai', { apiKey: 'sk-x' }); // not active → no reload
    expect(reload).not.toHaveBeenCalled();
    await service.updateProvider('anthropic', { apiKey: 'sk-y' }); // active → reload
    expect(reload).toHaveBeenCalledOnce();
  });

  it('setActiveProvider switches the provider and reloads', async () => {
    const { service, reload } = makeService();
    const resp = await service.setActiveProvider('google');
    expect(resp.activeProvider).toBe('google');
    expect(reload).toHaveBeenCalledOnce();
    expect(resp.providers).toHaveLength(4); // one masked entry per provider
  });
});
