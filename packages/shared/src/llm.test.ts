import { describe, expect, it } from 'vitest';
import {
  API_PROVIDER_CLIS,
  CLI_PROVIDER_MAP,
  LLM_PROVIDERS,
  LlmProviderSchema,
  ProviderCredentialSchema,
  providerSupportsBaseUrl,
  ProvidersResponseSchema,
  UpdateProviderCredentialRequestSchema,
} from './llm.js';

describe('LlmProviderSchema', () => {
  it('accepts every declared provider and rejects others', () => {
    for (const p of LLM_PROVIDERS) expect(LlmProviderSchema.parse(p)).toBe(p);
    expect(LlmProviderSchema.safeParse('cohere').success).toBe(false);
  });
});

describe('providerSupportsBaseUrl', () => {
  it('is true only for openai-compatible', () => {
    expect(providerSupportsBaseUrl('openai-compatible')).toBe(true);
    expect(providerSupportsBaseUrl('anthropic')).toBe(false);
    expect(providerSupportsBaseUrl('openai')).toBe(false);
  });
});

describe('CLI_PROVIDER_MAP / API_PROVIDER_CLIS', () => {
  it('maps claude → anthropic and leaves aider provider-less', () => {
    expect(CLI_PROVIDER_MAP.claude).toBe('anthropic');
    expect(CLI_PROVIDER_MAP.aider).toBeNull();
  });

  it('excludes the provider-less CLIs from API_PROVIDER_CLIS', () => {
    expect(API_PROVIDER_CLIS).not.toContain('aider');
    expect(API_PROVIDER_CLIS).toContain('claude');
  });
});

describe('ProviderCredentialSchema', () => {
  it('round-trips a stored credential (write-only key never present)', () => {
    const cred = {
      provider: 'anthropic' as const,
      hasKey: true,
      keyHint: 'abcd',
    };
    const parsed = ProviderCredentialSchema.parse(cred);
    expect(parsed).toEqual(cred);
    expect('apiKey' in parsed).toBe(false);
  });
});

describe('UpdateProviderCredentialRequestSchema', () => {
  it('trims baseUrl and rejects an over-long apiKey', () => {
    expect(UpdateProviderCredentialRequestSchema.parse({ baseUrl: '  http://x  ' }).baseUrl).toBe(
      'http://x',
    );
    expect(
      UpdateProviderCredentialRequestSchema.safeParse({ apiKey: 'a'.repeat(401) }).success,
    ).toBe(false);
  });
});

describe('ProvidersResponseSchema', () => {
  it('defaults activeProviderEnabled to true for older clients', () => {
    const parsed = ProvidersResponseSchema.parse({
      providers: [],
      activeProvider: 'anthropic',
    });
    expect(parsed.activeProviderEnabled).toBe(true);
  });
});
