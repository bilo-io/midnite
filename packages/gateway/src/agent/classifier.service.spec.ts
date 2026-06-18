import { describe, expect, it, vi } from 'vitest';
import { LlmClassifier } from './classifier.service';
import type { LlmService } from './llm/llm.service';
import { parseConfig, type MidniteConfig } from '@midnite/shared';

const baseConfig: MidniteConfig = parseConfig({
  agent: { pool: 4, provider: 'anthropic', plan: 'opus4.7', act: 'sonnet4.7' },
  terminal: {
    mode: 'pty',
    layout: 'split',
    args: [],
    scrollbackBytes: 262144,
    idleDisposeMs: 300000,
    maxSessions: 16,
    inheritSecrets: false,
  },
  knowledge: { dir: './knowledge' },
  repos: [],
  gateway: { port: 7777, uploadsDir: './.midnite/uploads', dbPath: './.midnite/midnite.db' },
});

function makeClassifier(generateStructured: ReturnType<typeof vi.fn>) {
  const llm = {
    enabled: true,
    getActModel: () => 'claude-sonnet-4-6',
    generateStructured,
  } as unknown as LlmService;
  return new LlmClassifier(llm, baseConfig);
}

describe('LlmClassifier', () => {
  it('asks for structured record_task output and returns it', async () => {
    const generateStructured = vi
      .fn()
      .mockResolvedValue({ data: { title: 'Fix login button', kind: 'bug' }, model: 'm' });

    const classifier = makeClassifier(generateStructured);
    const result = await classifier.classify('the login is broken', []);

    expect(result).toEqual({ title: 'Fix login button', kind: 'bug' });
    const call = generateStructured.mock.calls[0]![0];
    expect(call.schemaName).toBe('record_task');
    expect(call.model).toBe('claude-sonnet-4-6');
    expect(typeof call.system).toBe('string');
    expect(call.messages[0].text).toBe('the login is broken');
  });

  // The AI path degrades rather than throwing: a malformed model response must
  // not break task creation, so it falls back to a prompt-derived placeholder.
  it('falls back to a placeholder title when output fails validation', async () => {
    const generateStructured = vi
      .fn()
      .mockResolvedValue({ data: { title: 'ok', kind: 'not-a-real-kind' }, model: 'm' });

    const classifier = makeClassifier(generateStructured);
    const result = await classifier.classify('hello', []);
    expect(result).toEqual({ title: 'hello', kind: 'unknown' });
    expect(generateStructured).toHaveBeenCalledOnce();
  });

  it('falls back to a placeholder title when the provider call throws', async () => {
    const generateStructured = vi.fn().mockRejectedValue(new Error('no tool call'));

    const classifier = makeClassifier(generateStructured);
    const result = await classifier.classify('hello', []);
    expect(result).toEqual({ title: 'hello', kind: 'unknown' });
    expect(generateStructured).toHaveBeenCalledOnce();
  });

  it('uses a placeholder without calling the provider when AI is disabled', async () => {
    const generateStructured = vi.fn();
    const llm = { enabled: false, getActModel: () => 'm', generateStructured } as unknown as LlmService;
    const classifier = new LlmClassifier(llm, baseConfig);
    const result = await classifier.classify('do the thing', []);
    expect(result).toEqual({ title: 'do the thing', kind: 'unknown' });
    expect(generateStructured).not.toHaveBeenCalled();
  });
});
