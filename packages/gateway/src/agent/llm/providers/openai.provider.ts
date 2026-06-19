import OpenAI from 'openai';
import type { AgentPingResponse, LlmProvider } from '@midnite/shared';
import { jsonSchemaInstruction, parseJsonObjectLoose } from '../json-output';
import type {
  GenerateStructuredRequest,
  GenerateTextRequest,
  LlmMessage,
  LlmProviderAdapter,
  LlmStructuredResult,
  LlmTextResult,
  LlmUsage,
} from '../llm-provider.interface';

export interface OpenAiProviderOptions {
  id: LlmProvider;
  apiKey?: string;
  baseURL?: string;
  /**
   * How to coerce structured output. `json_schema` uses OpenAI's native
   * response-format schema (best for OpenAI itself); `json_object` asks for a
   * JSON object and relies on a prompt instruction (broader local-model support).
   */
  structuredMode: 'json_schema' | 'json_object';
  /** Whether a key is mandatory (false for local openai-compatible endpoints). */
  keyRequired: boolean;
  /**
   * The token-limit field name. OpenAI's current + reasoning models require
   * `max_completion_tokens` (they reject `max_tokens`); most local OpenAI-
   * compatible servers only understand `max_tokens`. Defaults to `max_tokens`.
   */
  maxTokensParam?: 'max_tokens' | 'max_completion_tokens';
}

export class OpenAiProvider implements LlmProviderAdapter {
  readonly id: LlmProvider;
  private readonly client: OpenAI | undefined;
  private readonly opts: OpenAiProviderOptions;

  constructor(opts: OpenAiProviderOptions) {
    this.id = opts.id;
    this.opts = opts;
    const usable = opts.apiKey || (!opts.keyRequired && opts.baseURL);
    this.client = usable
      ? new OpenAI({
          // Local endpoints often ignore the key but the SDK requires a non-empty string.
          apiKey: opts.apiKey || 'not-needed',
          ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
        })
      : undefined;
  }

  isEnabled(): boolean {
    return this.client !== undefined;
  }

  private require(): OpenAI {
    if (!this.client) {
      throw new Error(`${this.id} provider is not configured (missing API key${this.opts.baseURL ? '' : ' / base URL'}).`);
    }
    return this.client;
  }

  private tokenField(n: number): Record<string, number> {
    return { [this.opts.maxTokensParam ?? 'max_tokens']: n };
  }

  async generateText(req: GenerateTextRequest): Promise<LlmTextResult> {
    const res = await this.require().chat.completions.create(
      {
        model: req.model,
        ...this.tokenField(req.maxTokens),
        messages: this.toMessages(req.system, req.messages),
      },
      { signal: req.signal },
    );
    return { text: res.choices[0]?.message?.content ?? '', model: req.model, usage: toUsage(res) };
  }

  async generateStructured(req: GenerateStructuredRequest): Promise<LlmStructuredResult> {
    const useNative = this.opts.structuredMode === 'json_schema';
    const system = useNative
      ? req.system
      : [req.system, jsonSchemaInstruction(req.schema, req.schemaDescription)]
          .filter(Boolean)
          .join('\n\n');

    const res = await this.require().chat.completions.create(
      {
        model: req.model,
        ...this.tokenField(req.maxTokens),
        messages: this.toMessages(system, req.messages),
        response_format: useNative
          ? {
              type: 'json_schema',
              json_schema: { name: req.schemaName, schema: req.schema, strict: false },
            }
          : { type: 'json_object' },
      },
      { signal: req.signal },
    );
    const content = res.choices[0]?.message?.content ?? '';
    return { data: parseJsonObjectLoose(content), model: req.model, usage: toUsage(res) };
  }

  async ping(): Promise<Omit<AgentPingResponse, 'cli'>> {
    if (!this.client) {
      return { ok: false, model: '', reply: `AI is disabled — add an API key for ${this.id} in settings.` };
    }
    // Connectivity + credential smoke test; the LlmService owns model selection.
    try {
      await this.require().models.list();
      return { ok: true, model: 'connected', reply: 'system status: ok' };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, model: this.id, reply: `ping failed${status ? ` (${status})` : ''}: ${message}` };
    }
  }

  private toMessages(
    system: string | undefined,
    messages: LlmMessage[],
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    if (system) out.push({ role: 'system', content: system });
    for (const m of messages) {
      if (m.role === 'assistant') {
        out.push({ role: 'assistant', content: m.text });
        continue;
      }
      const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        ...(m.images ?? []).map((img) => ({
          type: 'image_url' as const,
          image_url: { url: `data:${img.mime};base64,${img.dataBase64}` },
        })),
        { type: 'text' as const, text: m.text },
      ];
      out.push({ role: 'user', content: parts });
    }
    return out;
  }
}

function toUsage(res: OpenAI.Chat.Completions.ChatCompletion): LlmUsage {
  return {
    inputTokens: res.usage?.prompt_tokens ?? 0,
    outputTokens: res.usage?.completion_tokens ?? 0,
  };
}
