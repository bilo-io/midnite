import { describe, expect, it, vi } from 'vitest';
import { AnthropicClassifier } from './classifier.service';
import { AnthropicService } from './anthropic.service';
import { parseConfig, type MidniteConfig } from '@midnite/shared';

const baseConfig: MidniteConfig = parseConfig({
  agent: { pool: 4, provider: 'claude', plan: 'opus4.7', act: 'sonnet4.7' },
  terminal: { mode: 'pty', layout: 'split', args: [], scrollbackBytes: 262144, idleDisposeMs: 300000 },
  knowledge: { dir: './knowledge' },
  repos: [],
  gateway: { port: 7777, uploadsDir: './.midnite/uploads', dbPath: './.midnite/midnite.db' },
});

function makeClassifier(create: ReturnType<typeof vi.fn>) {
  const anthropic = {
    enabled: true,
    getClient: () => ({ messages: { create } }) as never,
    getActModel: () => 'claude-sonnet-4-7',
    resolveModel: (s: string) => s,
  } as unknown as AnthropicService;
  return new AnthropicClassifier(anthropic, baseConfig);
}

describe('AnthropicClassifier', () => {
  it('sends a cache-controlled system prompt and forces record_task tool use', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'record_task',
          input: { title: 'Fix login button', kind: 'bug' },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const classifier = makeClassifier(create);
    const result = await classifier.classify('the login is broken', []);

    expect(result).toEqual({ title: 'Fix login button', kind: 'bug' });
    const call = create.mock.calls[0]![0];
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(call.tool_choice).toEqual({ type: 'tool', name: 'record_task' });
    expect(call.tools[0].name).toBe('record_task');
  });

  it('rejects invalid tool output', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'record_task',
          input: { title: 'ok', kind: 'not-a-real-kind' },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const classifier = makeClassifier(create);
    await expect(classifier.classify('hello', [])).rejects.toThrow(/failed validation/);
  });

  it('throws when no tool_use block is returned', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'sorry' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const classifier = makeClassifier(create);
    await expect(classifier.classify('hello', [])).rejects.toThrow(/did not return/);
  });
});
