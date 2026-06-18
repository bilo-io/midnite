import { describe, expect, it } from 'vitest';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';
import { OpenAiProvider } from './providers/openai.provider';

// Construction is offline (the SDK clients lazily connect on first call), so we
// can assert the enabled/disabled wiring without hitting any network.
describe('provider adapters: enabled wiring', () => {
  it('Anthropic is disabled with no credential and throws on use', async () => {
    const p = new AnthropicProvider(null);
    expect(p.isEnabled()).toBe(false);
    await expect(
      p.generateText({ model: 'haiku4.5', maxTokens: 8, messages: [{ role: 'user', text: 'hi' }] }),
    ).rejects.toThrow(/not configured/);
    expect((await p.ping()).ok).toBe(false);
  });

  it('Anthropic is enabled when given an API key', () => {
    expect(new AnthropicProvider({ kind: 'apiKey', value: 'sk-x', source: 'env' }).isEnabled()).toBe(true);
  });

  it('OpenAI requires a key', () => {
    expect(
      new OpenAiProvider({ id: 'openai', structuredMode: 'json_schema', keyRequired: true }).isEnabled(),
    ).toBe(false);
    expect(
      new OpenAiProvider({ id: 'openai', apiKey: 'sk-x', structuredMode: 'json_schema', keyRequired: true }).isEnabled(),
    ).toBe(true);
  });

  it('OpenAI-compatible is enabled by a base URL alone (local, no key)', () => {
    expect(new OpenAiCompatibleProvider({}).isEnabled()).toBe(false);
    expect(
      new OpenAiCompatibleProvider({ baseURL: 'http://localhost:11434/v1' }).isEnabled(),
    ).toBe(true);
  });

  it('Google needs an API key', () => {
    expect(new GoogleProvider(undefined).isEnabled()).toBe(false);
    expect(new GoogleProvider('key').isEnabled()).toBe(true);
  });
});
