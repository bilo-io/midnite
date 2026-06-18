import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock each vendor SDK so we can assert the request each adapter builds and that
// it parses the structured response — without any network. vi.hoisted keeps the
// spies referenceable inside the hoisted vi.mock factories.
const { anthropicCreate, openaiCreate, getModel, genContent } = vi.hoisted(() => ({
  anthropicCreate: vi.fn(),
  openaiCreate: vi.fn(),
  getModel: vi.fn(),
  genContent: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: anthropicCreate };
  },
}));
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: openaiCreate } };
    models = { list: vi.fn() };
  },
}));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = getModel;
  },
}));

import { AnthropicProvider } from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';
import { OpenAiProvider } from './providers/openai.provider';

const SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] };
const baseReq = {
  model: 'm',
  maxTokens: 64,
  system: 'sys',
  schema: SCHEMA,
  schemaName: 'rec',
  schemaDescription: 'record it',
  messages: [{ role: 'user' as const, text: 'hi' }],
};

beforeEach(() => {
  anthropicCreate.mockReset();
  openaiCreate.mockReset();
  getModel.mockReset();
  genContent.mockReset();
  getModel.mockReturnValue({ generateContent: genContent });
});

describe('AnthropicProvider.generateStructured', () => {
  it('forces the tool and parses tool_use.input', async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'rec', input: { ok: true } }],
    });
    const p = new AnthropicProvider({ kind: 'apiKey', value: 'k', source: 'env' });
    const res = await p.generateStructured(baseReq);

    const body = anthropicCreate.mock.calls[0]![0];
    expect(body.tools[0].name).toBe('rec');
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'rec' });
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(res.data).toEqual({ ok: true });
  });
});

describe('OpenAiProvider.generateStructured', () => {
  it('uses json_schema response format + max_completion_tokens', async () => {
    openaiCreate.mockResolvedValue({ choices: [{ message: { content: '{"ok":true}' } }] });
    const p = new OpenAiProvider({
      id: 'openai',
      apiKey: 'k',
      structuredMode: 'json_schema',
      keyRequired: true,
      maxTokensParam: 'max_completion_tokens',
    });
    const res = await p.generateStructured(baseReq);

    const body = openaiCreate.mock.calls[0]![0];
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.name).toBe('rec');
    expect(body.max_completion_tokens).toBe(64);
    expect(body.max_tokens).toBeUndefined();
    expect(res.data).toEqual({ ok: true });
  });
});

describe('GoogleProvider.generateStructured', () => {
  it('requests JSON mime + embeds the schema instruction, then parses', async () => {
    genContent.mockResolvedValue({ response: { text: () => '{"ok":true}' } });
    const p = new GoogleProvider('k');
    const res = await p.generateStructured(baseReq);

    const modelArgs = getModel.mock.calls[0]![0];
    expect(modelArgs.systemInstruction).toContain('JSON');
    const genArgs = genContent.mock.calls[0]![0];
    expect(genArgs.generationConfig.responseMimeType).toBe('application/json');
    expect(res.data).toEqual({ ok: true });
  });
});
