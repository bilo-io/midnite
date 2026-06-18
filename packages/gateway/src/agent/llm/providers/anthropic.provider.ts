import Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '@nestjs/common';
import type { AgentPingResponse, LlmProvider } from '@midnite/shared';
import {
  resolveAnthropicCredential,
  type AnthropicCredential,
} from '../../anthropic-credentials';
import type {
  GenerateStructuredRequest,
  GenerateTextRequest,
  LlmMessage,
  LlmProviderAdapter,
  LlmStructuredResult,
  LlmTextResult,
} from '../llm-provider.interface';

// Friendly aliases → concrete Anthropic model ids. Resolution lives here (not in
// shared) because it is provider-specific. Unknown values pass through untouched.
const MODEL_ALIASES: Record<string, string> = {
  'opus4.8': 'claude-opus-4-8',
  'sonnet4.6': 'claude-sonnet-4-6',
  'haiku4.5': 'claude-haiku-4-5-20251001',
  // Legacy aliases from older configs — kept resolving. The 4.7 Sonnet id was
  // retired (404s), so it remaps to the current Sonnet.
  'opus4.7': 'claude-opus-4-7',
  'sonnet4.7': 'claude-sonnet-4-6',
};

const IMAGE_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
type AnthropicMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

/**
 * Resolve an Anthropic credential: an explicit DB key wins, else fall back to
 * the env var / macOS Claude-CLI keychain (the historical behaviour). Returns
 * null when nothing is available, leaving the adapter disabled.
 */
export async function resolveAnthropicAdapterCredential(
  dbKey: string | undefined,
  logger: Pick<Logger, 'log' | 'warn'>,
): Promise<AnthropicCredential | null> {
  if (dbKey) return { kind: 'apiKey', value: dbKey, source: 'env' };
  return resolveAnthropicCredential(logger);
}

export class AnthropicProvider implements LlmProviderAdapter {
  readonly id: LlmProvider = 'anthropic';
  private readonly client: Anthropic | undefined;

  constructor(cred: AnthropicCredential | null) {
    if (!cred) {
      this.client = undefined;
    } else if (cred.kind === 'apiKey') {
      this.client = new Anthropic({ apiKey: cred.value });
    } else {
      this.client = new Anthropic({
        authToken: cred.value,
        defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
      });
    }
  }

  isEnabled(): boolean {
    return this.client !== undefined;
  }

  private require(): Anthropic {
    if (!this.client) {
      throw new Error('Anthropic provider is not configured (no API key or Claude CLI login).');
    }
    return this.client;
  }

  private resolveModel(model: string): string {
    return MODEL_ALIASES[model] ?? model;
  }

  async generateText(req: GenerateTextRequest): Promise<LlmTextResult> {
    const model = this.resolveModel(req.model);
    const res = await this.require().messages.create(
      {
        model,
        max_tokens: req.maxTokens,
        ...(req.system ? { system: req.system } : {}),
        messages: this.toMessages(req.messages),
      },
      { signal: req.signal },
    );
    return { text: extractText(res), model };
  }

  async generateStructured(req: GenerateStructuredRequest): Promise<LlmStructuredResult> {
    const model = this.resolveModel(req.model);
    const res = await this.require().messages.create(
      {
        model,
        max_tokens: req.maxTokens,
        ...(req.system
          ? { system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }] }
          : {}),
        tools: [
          {
            name: req.schemaName,
            description: req.schemaDescription ?? `Record the ${req.schemaName} result.`,
            input_schema: req.schema as Anthropic.Messages.Tool.InputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: req.schemaName },
        messages: this.toMessages(req.messages),
      },
      { signal: req.signal },
    );
    const toolUse = res.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === 'tool_use' && block.name === req.schemaName,
    );
    if (!toolUse) {
      throw new Error(`Anthropic did not return a ${req.schemaName} tool call`);
    }
    return { data: toolUse.input, model };
  }

  async ping(): Promise<Omit<AgentPingResponse, 'cli'>> {
    if (!this.client) {
      return {
        ok: false,
        model: '',
        reply: 'AI is disabled — set ANTHROPIC_API_KEY, run `claude` to log in, or add a key in settings.',
      };
    }
    const model = this.resolveModel('haiku4.5');
    try {
      await this.client.messages.create({
        model,
        max_tokens: 16,
        system: "You are midnite's health check.",
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { ok: true, model, reply: 'system status: ok' };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, model, reply: `ping failed${status ? ` (${status})` : ''}: ${message}` };
    }
  }

  private toMessages(messages: LlmMessage[]): Anthropic.Messages.MessageParam[] {
    return messages.map((m) => ({
      role: m.role,
      content: [
        ...(m.images ?? [])
          .filter((img) => IMAGE_MEDIA_TYPES.has(img.mime))
          .map((img) => ({
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: img.mime as AnthropicMediaType,
              data: img.dataBase64,
            },
          })),
        { type: 'text' as const, text: m.text },
      ],
    }));
  }
}

function extractText(res: Anthropic.Messages.Message): string {
  return res.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}
