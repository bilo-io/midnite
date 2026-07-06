import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ChatIntentSchema,
  STATUSES,
  TASK_KINDS,
  type ChatInferencePath,
  type ChatIntent,
  type ChatIntentParse,
  type LlmProvider,
  type MidniteConfig,
} from '@midnite/shared';

import { MIDNITE_CONFIG } from '../config.token';
import { LlmService } from '../agent/llm/llm.service';
import { UsageService } from '../usage/usage.service';
import { parseIntentGrammar } from './lib/intent-grammar';
import { CHAT_INTENT_SYSTEM_PROMPT } from './chat.prompts';

/** The provider whose adapter is a local, zero-API-cost model (Ollama/LM Studio/vLLM). */
const LOCAL_PROVIDER: LlmProvider = 'openai-compatible';

/** A resolved fuzzy-path route: which provider to call and how to label the cost. */
type Route = { provider: LlmProvider | undefined; path: Extract<ChatInferencePath, 'local' | 'provider'> };

/**
 * Phase 59 A + D — the intent spine + routing policy. Turns a natural-language
 * command into a typed {@link ChatIntentParse}, **deterministic-first**: the
 * grammar parser handles unambiguous commands with zero inference; anything it
 * can't parse falls back to the LLM (`generateStructuredVia` against the same
 * {@link ChatIntentSchema}), so the executor (Theme B) is source-agnostic.
 *
 * **Routing (Theme D) — near-zero cost by default, never a surprise bill:**
 * 1. grammar (no LLM) → `deterministic`;
 * 2. else, when `chat.preferLocal` and a local `openai-compatible` provider is
 *    configured, route there (`local`, zero API cost) ahead of the active paid one;
 * 3. else the active provider (`local` if it's itself openai-compatible, else `provider`);
 * 4. else **refuse with guidance** — a low-confidence `unknown` telling the user to
 *    configure a local model or an API key (no AI is spent, so path stays `deterministic`).
 * A paid call is additionally gated on the Phase 50 hard budget cap: over-cap fails
 * soft to guidance rather than spending. The resolved {@link ChatInferencePath} rides
 * on the parse so preview + command report the true cost line.
 *
 * Confidence: a grammar hit is `1`; a concrete LLM intent `0.75`; an LLM `unknown`
 * (or invalid/failed/unconfigured/refused/capped) is low so the UI clarifies rather
 * than guessing (Theme F).
 */
@Injectable()
export class ChatIntentService {
  private readonly logger = new Logger(ChatIntentService.name);

  constructor(
    @Inject(LlmService) private readonly llm: LlmService,
    @Inject(UsageService) private readonly usage: UsageService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {}

  async parse(input: string, signal?: AbortSignal): Promise<ChatIntentParse> {
    const grammar = parseIntentGrammar(input);
    if (grammar) return { intent: grammar, source: 'grammar', confidence: 1, inferencePath: 'deterministic' };

    const route = await this.resolveRoute();
    if (!route) {
      // Step 4 — refuse with guidance. No AI was spent, so the cost line stays "no AI used".
      return refuse(
        input,
        'No AI provider is configured for free-form chat. Configure a local model or an API key, or use a structured command like `add "title" p1 repo:api`.',
      );
    }

    // A paid call must respect the Phase 50 hard budget cap; a local (free) call bypasses it.
    if (route.path === 'provider' && this.usage.checkBudget().over) {
      return refuse(
        input,
        'Chat AI is paused — the spend cap has been reached. Try a structured command like `add "title" p1 repo:api`.',
      );
    }

    try {
      const { data } = await this.llm.generateStructuredVia(
        route.provider,
        {
          model: this.llm.getActModel(),
          maxTokens: 512,
          system: CHAT_INTENT_SYSTEM_PROMPT,
          schema: CHAT_INTENT_LLM_SCHEMA,
          schemaName: 'record_intent',
          schemaDescription: 'Record the board command as one typed intent.',
          messages: [{ role: 'user', text: input }],
          signal,
        },
        'chat',
      );
      const parsed = ChatIntentSchema.safeParse(cleanNulls(data));
      if (!parsed.success) {
        this.logger.warn(`chat intent output failed validation: ${parsed.error.message}`);
        return {
          intent: unknown(input, 'Could not understand that command.'),
          source: 'llm',
          confidence: 0.2,
          inferencePath: route.path,
        };
      }
      const intent = parsed.data;
      return {
        intent,
        source: 'llm',
        confidence: intent.type === 'unknown' ? 0.3 : 0.75,
        inferencePath: route.path,
      };
    } catch (err) {
      // A model/API failure must not surface a 500 — degrade to an unknown intent
      // the caller can turn into a clarify prompt. No usable output → no cost claimed.
      this.logger.warn(
        `chat intent AI call failed (${err instanceof Error ? err.message : 'unknown'}); returning unknown intent`,
      );
      return refuse(input, 'The AI provider is unavailable right now.');
    }
  }

  /**
   * Resolve the fuzzy-path route (local-preferred → active → none). Returns `null`
   * when no provider is usable, which the caller turns into a refuse-with-guidance.
   */
  private async resolveRoute(): Promise<Route | null> {
    const active = this.llm.activeProvider;
    // Step 2 — prefer a configured local model over the active paid one.
    if (
      this.config.chat.preferLocal &&
      active !== LOCAL_PROVIDER &&
      (await this.llm.isProviderEnabled(LOCAL_PROVIDER))
    ) {
      return { provider: LOCAL_PROVIDER, path: 'local' };
    }
    // Step 3 — the active provider (itself local iff it's openai-compatible).
    if (this.llm.enabled) {
      return { provider: undefined, path: active === LOCAL_PROVIDER ? 'local' : 'provider' };
    }
    return null;
  }
}

function unknown(text: string, reason: string): ChatIntent {
  return { type: 'unknown', text, reason };
}

/** A refuse/degrade result: unknown intent + guidance, no AI spent (deterministic cost line). */
function refuse(text: string, reason: string): ChatIntentParse {
  return { intent: unknown(text, reason), source: 'grammar', confidence: 0, inferencePath: 'deterministic' };
}

/**
 * Drop `null`/`undefined` fields so a flat model response (which sets
 * inapplicable fields to `null`) validates cleanly against the strict optional
 * fields of the discriminated union.
 */
function cleanNulls(data: unknown): unknown {
  if (data == null || typeof data !== 'object') return data;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? cleanNulls(v) : v;
  }
  return out;
}

/**
 * A flat superset JSON Schema the model fills — one object with a `type`
 * discriminant plus every possible field (optional). {@link cleanNulls} +
 * {@link ChatIntentSchema} then narrow it to the correct union member; the system
 * prompt tells the model which fields belong to which type.
 */
const CHAT_INTENT_LLM_SCHEMA = {
  type: 'object' as const,
  properties: {
    type: {
      type: 'string',
      enum: [
        'createTask',
        'bulkCreate',
        'breakdown',
        'setPriority',
        'setStatus',
        'assign',
        'addDependency',
        'query',
        'unknown',
      ],
      description: 'The kind of board command.',
    },
    title: { type: 'string', description: 'createTask: the task title.' },
    titles: {
      type: 'array',
      items: { type: 'string' },
      description: 'bulkCreate: the list of task titles.',
    },
    goal: { type: 'string', description: 'breakdown: the goal to decompose into tasks.' },
    task: { type: 'string', description: 'A task reference (id or title) for setPriority/setStatus/assign/addDependency.' },
    dependsOn: { type: 'string', description: 'addDependency: the blocker task reference.' },
    priority: { type: 'number', enum: [0, 1, 2, 3], description: '0 Low · 1 Normal · 2 High · 3 Urgent.' },
    status: { type: 'string', enum: STATUSES as unknown as string[], description: 'setStatus: the target column.' },
    kind: { type: 'string', enum: TASK_KINDS as unknown as string[], description: 'createTask: the task kind.' },
    repo: { type: 'string', description: 'Repo slug for createTask/bulkCreate/breakdown/assign.' },
    project: { type: 'string', description: 'Project for createTask/bulkCreate/breakdown/assign.' },
    milestone: { type: 'string', description: 'assign: milestone name.' },
    text: { type: 'string', description: 'query/unknown: the raw question or input.' },
    read: {
      type: 'object',
      description: 'query: a deterministic read filter, when the question maps to one.',
      properties: {
        metric: { type: 'string', enum: ['list', 'count'] },
        status: { type: 'string', enum: STATUSES as unknown as string[] },
        blocked: { type: 'boolean' },
        ready: { type: 'boolean' },
      },
      required: ['metric'],
    },
    reason: { type: 'string', description: 'unknown: why the command could not be mapped.' },
  },
  required: ['type'],
};
