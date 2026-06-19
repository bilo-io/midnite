import type { AgentPingResponse, LlmProvider } from '@midnite/shared';

/** A base64-encoded image part, provider-agnostic; each adapter formats it. */
export interface LlmImagePart {
  mime: string;
  dataBase64: string;
}

export interface LlmMessage {
  role: 'user' | 'assistant';
  text: string;
  images?: LlmImagePart[];
}

/** A JSON Schema object (the `properties`/`required`/… shape), passed through to
 *  whichever structured-output mechanism the provider supports. */
export type JsonSchema = Record<string, unknown>;

export interface GenerateTextRequest {
  system?: string;
  messages: LlmMessage[];
  maxTokens: number;
  /** Resolved concrete model id (the LlmService fills this in per role). */
  model: string;
  signal?: AbortSignal;
}

export interface GenerateStructuredRequest extends GenerateTextRequest {
  /** The JSON Schema the output must conform to. */
  schema: JsonSchema;
  /** A short name for the schema/tool (provider tool/function name). */
  schemaName: string;
  schemaDescription?: string;
}

/** Token usage reported by a provider SDK for a single call. */
export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmTextResult {
  text: string;
  model: string;
  /** Token usage when the provider SDK reports it; absent for endpoints that don't. */
  usage?: LlmUsage;
}

export interface LlmStructuredResult {
  /** Raw parsed object — the caller zod-validates it. */
  data: unknown;
  model: string;
  /** Token usage when the provider SDK reports it; absent for endpoints that don't. */
  usage?: LlmUsage;
}

/**
 * A single LLM provider adapter. Built by the LlmService for the active provider
 * from its stored credential + model config. `ping` returns everything but `cli`
 * (the caller tags that on), matching the old AnthropicService.ping shape.
 */
export interface LlmProviderAdapter {
  readonly id: LlmProvider;
  /** Whether the adapter has the credentials it needs to make calls. */
  isEnabled(): boolean;
  generateText(req: GenerateTextRequest): Promise<LlmTextResult>;
  generateStructured(req: GenerateStructuredRequest): Promise<LlmStructuredResult>;
  ping(): Promise<Omit<AgentPingResponse, 'cli'>>;
}
