import type { LlmProvider } from '@midnite/shared';

// Best-effort price table: USD per 1,000,000 tokens, keyed by a normalised model
// alias. These are ESTIMATES for cost-visibility only — never billing-accurate
// (prices change, tiers/caching/batch discounts are ignored). An unknown model
// falls back to zero so usage is still recorded (tokens) without a fake cost.
//
// Keep entries coarse-grained (family aliases), matched by substring against the
// concrete model id the adapter returns (e.g. `claude-opus-4-8`, `gpt-5.4-mini`,
// `gemini-2.5-pro`). First match wins, so order most-specific first.

export interface ModelPrice {
  /** USD per 1M input tokens. */
  inputPerM: number;
  /** USD per 1M output tokens. */
  outputPerM: number;
}

// Substring → price. Ordered: more specific aliases (mini/flash/haiku) before the
// broader family so e.g. `gpt-5.4-mini` doesn't match the base `gpt-5` tier.
const PRICE_TABLE: Array<{ match: string; price: ModelPrice }> = [
  // Anthropic Claude
  { match: 'haiku', price: { inputPerM: 1, outputPerM: 5 } },
  { match: 'opus', price: { inputPerM: 15, outputPerM: 75 } },
  { match: 'sonnet', price: { inputPerM: 3, outputPerM: 15 } },
  // OpenAI GPT (mini variants before the base family)
  { match: 'gpt-5.4-mini', price: { inputPerM: 0.25, outputPerM: 2 } },
  { match: 'gpt-5-mini', price: { inputPerM: 0.25, outputPerM: 2 } },
  { match: 'o4-mini', price: { inputPerM: 1.1, outputPerM: 4.4 } },
  { match: 'gpt-5', price: { inputPerM: 1.25, outputPerM: 10 } },
  { match: 'gpt-4o-mini', price: { inputPerM: 0.15, outputPerM: 0.6 } },
  { match: 'gpt-4o', price: { inputPerM: 2.5, outputPerM: 10 } },
  { match: 'gpt-4', price: { inputPerM: 10, outputPerM: 30 } },
  { match: 'gpt-', price: { inputPerM: 0.5, outputPerM: 1.5 } },
  // Google Gemini (flash variants before pro/base)
  { match: 'gemini-2.5-flash', price: { inputPerM: 0.3, outputPerM: 2.5 } },
  { match: 'gemini-2.0-flash', price: { inputPerM: 0.1, outputPerM: 0.4 } },
  { match: 'gemini-1.5-flash', price: { inputPerM: 0.075, outputPerM: 0.3 } },
  { match: 'gemini-2.5-pro', price: { inputPerM: 1.25, outputPerM: 10 } },
  { match: 'gemini-1.5-pro', price: { inputPerM: 1.25, outputPerM: 5 } },
  { match: 'gemini', price: { inputPerM: 0.5, outputPerM: 1.5 } },
];

/** Zero-cost fallback for an unrecognised model (tokens still tracked). */
const UNKNOWN_PRICE: ModelPrice = { inputPerM: 0, outputPerM: 0 };

/**
 * Look up the (estimated) price for a model id. Case-insensitive substring match
 * against the table; returns a zero price when nothing matches. `_provider` is
 * accepted for future provider-specific disambiguation but unused today.
 */
export function priceForModel(model: string, _provider?: LlmProvider): ModelPrice {
  const id = model.toLowerCase();
  for (const { match, price } of PRICE_TABLE) {
    if (id.includes(match)) return price;
  }
  return UNKNOWN_PRICE;
}

/** Whether a model has a known (non-zero) price in the table. */
export function hasKnownPrice(model: string, provider?: LlmProvider): boolean {
  const p = priceForModel(model, provider);
  return p.inputPerM > 0 || p.outputPerM > 0;
}

/**
 * Best-effort USD estimate for a call. Rounded to 6 decimal places (sub-cent
 * precision) to keep stored values tidy. Returns 0 for unknown models.
 */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  provider?: LlmProvider,
): number {
  const { inputPerM, outputPerM } = priceForModel(model, provider);
  const cost = (inputTokens * inputPerM + outputTokens * outputPerM) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

// Anthropic prompt-caching multipliers on the base input rate: a cache **read**
// bills at ~10% of input, a cache **write** (creation) at ~125%. Applied to the
// model's `inputPerM` so cache-heavy agent sessions cost honestly (Phase 61 A).
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

/**
 * Cache-aware cost for a whole harvested session (Phase 61 A). Prices input,
 * output, cache-read, and cache-write tokens separately. Returns `null` — not 0 —
 * for an unpriced model, so the caller can honestly render "tokens shown, cost
 * unknown" rather than a fake $0 (the P51 honesty contract).
 */
export function estimateSessionCostUsd(
  model: string,
  tokens: {
    inputTokens: number;
    outputTokens: number;
    cachedReadTokens: number;
    cachedWriteTokens: number;
  },
  provider?: LlmProvider,
): number | null {
  if (!hasKnownPrice(model, provider)) return null;
  const { inputPerM, outputPerM } = priceForModel(model, provider);
  const cost =
    (tokens.inputTokens * inputPerM +
      tokens.outputTokens * outputPerM +
      tokens.cachedReadTokens * inputPerM * CACHE_READ_MULTIPLIER +
      tokens.cachedWriteTokens * inputPerM * CACHE_WRITE_MULTIPLIER) /
    1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
