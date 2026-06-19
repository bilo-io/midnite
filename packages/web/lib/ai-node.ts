import {
  LLM_PROVIDERS,
  LLM_PROVIDER_LABEL,
  LLM_PROVIDER_MODEL_SUGGESTIONS,
  type LlmProvider,
} from '@midnite/shared';

// Maps an LLM provider id to the key the ProviderIcon component knows. Most are
// 1:1; Google's provider id is `google` but its brand icon is keyed `gemini`.
export const LLM_PROVIDER_ICON_KEY: Record<LlmProvider, string> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'gemini',
  'openai-compatible': 'openai-compatible',
};

const PROVIDER_VALUES: readonly string[] = LLM_PROVIDERS;

function isLlmProvider(value: unknown): value is LlmProvider {
  return typeof value === 'string' && PROVIDER_VALUES.includes(value);
}

// Best-effort provider inference from a model id, used to brand an AI node whose
// provider is left on "Active provider" but whose model points at a known vendor.
const MODEL_PREFIX_PROVIDER: Array<[RegExp, LlmProvider]> = [
  [/^(gpt|o\d|chatgpt|dall|davinci|babbage|text-embedding)/i, 'openai'],
  [/^(claude|opus|sonnet|haiku|fable)/i, 'anthropic'],
  [/^(gemini|imagen|palm|bison)/i, 'google'],
];

export function providerFromModelId(model: string): LlmProvider | null {
  const id = model.trim().toLowerCase();
  if (!id) return null;
  for (const [re, provider] of MODEL_PREFIX_PROVIDER) {
    if (re.test(id)) return provider;
  }
  // Fall back to an exact suggestion match (covers openai-compatible ids like
  // `llama3.3` that have no distinctive prefix).
  for (const provider of LLM_PROVIDERS) {
    if (LLM_PROVIDER_MODEL_SUGGESTIONS[provider].some((m) => m.toLowerCase() === id)) {
      return provider;
    }
  }
  return null;
}

/**
 * Resolve which provider an `ai.claude` node should be branded with on the canvas.
 * A pinned `provider` wins; otherwise we infer from the model id. Returns null when
 * the node follows the active provider with no model hint (→ show the default robot).
 */
export function resolveAiNodeProvider(params: Record<string, unknown>): LlmProvider | null {
  if (isLlmProvider(params.provider)) return params.provider;
  if (typeof params.model === 'string') return providerFromModelId(params.model);
  return null;
}

export type ModelOption = { value: string; label: string };
export type ModelOptionGroup = { label: string; options: ModelOption[] };

/**
 * Model dropdown options for an AI node, scoped to the selected provider. When the
 * provider is blank ("Active provider"), suggestions from every provider are offered,
 * grouped by vendor so the choice still pins a recognisable model.
 */
export function aiModelOptions(provider: unknown): ModelOption[] | ModelOptionGroup[] {
  if (isLlmProvider(provider)) {
    return LLM_PROVIDER_MODEL_SUGGESTIONS[provider].map((m) => ({ value: m, label: m }));
  }
  return LLM_PROVIDERS.map((p) => ({
    label: LLM_PROVIDER_LABEL[p],
    options: LLM_PROVIDER_MODEL_SUGGESTIONS[p].map((m) => ({ value: m, label: m })),
  }));
}
