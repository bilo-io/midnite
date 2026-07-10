import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidniteConfig } from '@midnite/shared';
import type { ProviderCredentialsRepository } from '../agent/provider-credentials.repository';
import { StudioTtsService } from './studio-tts.service';

function config(provider: 'auto' | 'openai' | 'off'): MidniteConfig {
  return {
    memory: { studio: { tts: { provider, model: 'm', voiceA: 'alloy', voiceB: 'nova' }, video: { mode: 'auto' } } },
  } as unknown as MidniteConfig;
}

function creds(key: string | null) {
  return {
    getProvider: vi.fn(() => (key ? ({ apiKey: key } as never) : undefined)),
  } as unknown as ProviderCredentialsRepository;
}

describe('StudioTtsService', () => {
  const OLD = process.env['OPENAI_API_KEY'];
  beforeEach(() => {
    delete process.env['OPENAI_API_KEY'];
  });
  afterEach(() => {
    if (OLD === undefined) delete process.env['OPENAI_API_KEY'];
    else process.env['OPENAI_API_KEY'] = OLD;
  });

  it('exposes the two configured voices', () => {
    const svc = new StudioTtsService(config('auto'), creds(null));
    expect(svc.voices).toEqual({ a: 'alloy', b: 'nova' });
  });

  it('is disabled when provider is off, even with a key', () => {
    const svc = new StudioTtsService(config('off'), creds('sk-test'));
    expect(svc.isEnabled()).toBe(false);
  });

  it('is disabled when no credential is resolvable', () => {
    const svc = new StudioTtsService(config('auto'), creds(null));
    expect(svc.isEnabled()).toBe(false);
  });

  it('is enabled when an OpenAI credential is present', () => {
    const svc = new StudioTtsService(config('auto'), creds('sk-test'));
    expect(svc.isEnabled()).toBe(true);
  });

  it('falls back to the OPENAI_API_KEY env var', () => {
    process.env['OPENAI_API_KEY'] = 'sk-env';
    const svc = new StudioTtsService(config('auto'), creds(null));
    expect(svc.isEnabled()).toBe(true);
  });

  it('synthesize returns null (degraded) when disabled', async () => {
    const svc = new StudioTtsService(config('off'), creds('sk-test'));
    expect(await svc.synthesize([{ voice: 'alloy', text: 'hi' }])).toBeNull();
  });
});
