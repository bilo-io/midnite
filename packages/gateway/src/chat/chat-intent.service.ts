import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ChatIntentSchema,
  STATUSES,
  TASK_KINDS,
  type ChatIntent,
  type ChatIntentParse,
} from '@midnite/shared';

import { LlmService } from '../agent/llm/llm.service';
import { parseIntentGrammar } from './lib/intent-grammar';
import { CHAT_INTENT_SYSTEM_PROMPT } from './chat.prompts';

/**
 * Phase 59 A — the intent spine. Turns a natural-language command into a typed
 * {@link ChatIntentParse}, **deterministic-first**: the grammar parser handles
 * unambiguous commands with zero inference; anything it can't parse falls back to
 * the LLM (`generateStructured` against the same {@link ChatIntentSchema}), so
 * the executor (Theme B) is source-agnostic.
 *
 * Confidence: a grammar hit is `1`; a concrete LLM intent `0.75`; an LLM
 * `unknown` (or invalid/failed/unconfigured) is low so the UI clarifies rather
 * than guessing (Theme F). The routing *policy* (local-preferred, budget caps,
 * refuse-with-guidance) is Theme D — here the fallback simply uses the active
 * provider and degrades to an `unknown` intent when unavailable.
 */
@Injectable()
export class ChatIntentService {
  private readonly logger = new Logger(ChatIntentService.name);

  constructor(@Inject(LlmService) private readonly llm: LlmService) {}

  async parse(input: string, signal?: AbortSignal): Promise<ChatIntentParse> {
    const grammar = parseIntentGrammar(input);
    if (grammar) return { intent: grammar, source: 'grammar', confidence: 1 };

    if (!this.llm.enabled) {
      return {
        intent: unknown(input, 'No AI provider configured; try a structured command like `add "title" p1 repo:api`.'),
        source: 'grammar',
        confidence: 0,
      };
    }

    try {
      const { data } = await this.llm.generateStructured(
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
        return { intent: unknown(input, 'Could not understand that command.'), source: 'llm', confidence: 0.2 };
      }
      const intent = parsed.data;
      return { intent, source: 'llm', confidence: intent.type === 'unknown' ? 0.3 : 0.75 };
    } catch (err) {
      // A model/API failure must not surface a 500 — degrade to an unknown intent
      // the caller can turn into a clarify prompt.
      this.logger.warn(
        `chat intent AI call failed (${err instanceof Error ? err.message : 'unknown'}); returning unknown intent`,
      );
      return { intent: unknown(input, 'The AI provider is unavailable right now.'), source: 'grammar', confidence: 0 };
    }
  }
}

function unknown(text: string, reason: string): ChatIntent {
  return { type: 'unknown', text, reason };
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
