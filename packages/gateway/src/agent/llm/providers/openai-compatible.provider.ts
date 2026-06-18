import { OpenAiProvider } from './openai.provider';

/**
 * Generic OpenAI-compatible endpoint (OpenRouter, Ollama, LM Studio, vLLM, …).
 * Reuses the OpenAI chat-completions adapter but points at a user-supplied base
 * URL, treats the key as optional (local models often need none), and coerces
 * structured output via JSON-object mode + a schema instruction, which more
 * local servers support than OpenAI's native json_schema response format.
 */
export class OpenAiCompatibleProvider extends OpenAiProvider {
  constructor(opts: { apiKey?: string; baseURL?: string }) {
    super({
      id: 'openai-compatible',
      apiKey: opts.apiKey,
      baseURL: opts.baseURL,
      structuredMode: 'json_object',
      keyRequired: false,
    });
  }
}
