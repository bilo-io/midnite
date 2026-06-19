import { z } from 'zod';
import { AGENT_CLIS, type AgentCli } from './agents.js';

// LLM API providers the gateway calls directly for its OWN AI features (task
// classification, project plan drafting, heartbeat, the workflow AI node, …).
// Distinct from `AgentCli`, which is the external binary spawned in a session
// terminal. A provider is an HTTP API + credentials; a CLI is a process.
export const LLM_PROVIDERS = ['anthropic', 'openai', 'google', 'openai-compatible'] as const;
export const LlmProviderSchema = z.enum(LLM_PROVIDERS);
export type LlmProvider = z.infer<typeof LlmProviderSchema>;
export const LLM_PROVIDER_DEFAULT: LlmProvider = 'anthropic';

/** Human label for each provider, for menus. */
export const LLM_PROVIDER_LABEL: Record<LlmProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google Gemini',
  'openai-compatible': 'OpenAI-compatible',
};

// Suggested model ids per provider, surfaced as autocomplete in the model
// fields (free-text — the user can type any id their endpoint supports). For
// Anthropic these are friendly aliases the adapter resolves to dated ids.
export const LLM_PROVIDER_MODEL_SUGGESTIONS: Record<LlmProvider, string[]> = {
  anthropic: ['opus4.8', 'sonnet4.6', 'haiku4.5'],
  openai: ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'o4-mini'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  'openai-compatible': ['llama3.3', 'qwen2.5', 'mistral', 'deepseek-r1'],
};

// Where to obtain an API key for each provider, linked from the settings UI.
// `openai-compatible` has no single vendor — it points at OpenRouter, the most
// common hosted OpenAI-compatible API that issues keys (local endpoints like
// Ollama need none, configured via the base URL instead).
export const LLM_PROVIDER_API_KEY_URL: Record<LlmProvider, string> = {
  anthropic: 'https://console.anthropic.com/settings/keys',
  openai: 'https://platform.openai.com/api-keys',
  google: 'https://aistudio.google.com/app/apikey',
  'openai-compatible': 'https://openrouter.ai/keys',
};

// Which provider an agent CLI's "API" tab configures. `aider` has no first-party
// API (it proxies other providers), so it is CLI-only → no API tab.
export const CLI_PROVIDER_MAP: Record<AgentCli, LlmProvider | null> = {
  claude: 'anthropic',
  gemini: 'google',
  codex: 'openai',
  opencode: 'openai-compatible',
  aider: null,
};

// Convenience: the CLIs that have an associated API provider, in CLI order.
export const API_PROVIDER_CLIS = AGENT_CLIS.filter(
  (cli) => CLI_PROVIDER_MAP[cli] !== null,
);

// The openai-compatible provider points at a user-supplied base URL (Ollama,
// OpenRouter, LM Studio, vLLM, …) and may not need a key for local models.
export function providerSupportsBaseUrl(provider: LlmProvider): boolean {
  return provider === 'openai-compatible';
}

/**
 * A provider's credential + model config, as returned by the API. The raw API
 * key is WRITE-ONLY and never serialised — only `hasKey` plus a short `keyHint`
 * (last 4 chars) are exposed, mirroring the write-only spirit of webhook secrets.
 */
export const ProviderCredentialSchema = z.object({
  provider: LlmProviderSchema,
  /** True when a key is stored (or, for Anthropic, resolvable from env/keychain). */
  hasKey: z.boolean(),
  /** Last 4 chars of the stored key, for display. Absent when no key is stored. */
  keyHint: z.string().optional(),
  /** Base URL for openai-compatible endpoints. */
  baseUrl: z.string().optional(),
  /** Model alias/id for the "plan" role (overrides config.agent.plan). */
  planModel: z.string().optional(),
  /** Model alias/id for the "act" role (overrides config.agent.act). */
  actModel: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ProviderCredential = z.infer<typeof ProviderCredentialSchema>;

// Upsert a provider's config. `apiKey` is write-only: omit to leave unchanged,
// pass '' to clear it. Other fields follow the same omit-to-leave rule.
export const UpdateProviderCredentialRequestSchema = z.object({
  apiKey: z.string().max(400).optional(),
  baseUrl: z.string().trim().max(1024).optional(),
  planModel: z.string().trim().max(200).optional(),
  actModel: z.string().trim().max(200).optional(),
});
export type UpdateProviderCredentialRequest = z.infer<
  typeof UpdateProviderCredentialRequestSchema
>;

// The single active provider that powers the gateway's AI features.
export const UpdateActiveProviderRequestSchema = z.object({
  activeProvider: LlmProviderSchema,
});
export type UpdateActiveProviderRequest = z.infer<
  typeof UpdateActiveProviderRequestSchema
>;

// --- Response envelopes ---

export const ProvidersResponseSchema = z.object({
  providers: z.array(ProviderCredentialSchema),
  activeProvider: LlmProviderSchema,
  /**
   * Whether the active provider can actually make calls right now. Unlike a
   * provider's `hasKey` (stored/env key only), this reflects the live adapter —
   * so Anthropic via the Claude CLI keychain reads as enabled even with no
   * stored key. Defaults true so older clients don't false-warn.
   */
  activeProviderEnabled: z.boolean().default(true),
});
export type ProvidersResponse = z.infer<typeof ProvidersResponseSchema>;

export const ProviderResponseSchema = z.object({
  provider: ProviderCredentialSchema,
  activeProvider: LlmProviderSchema,
});
export type ProviderResponse = z.infer<typeof ProviderResponseSchema>;
