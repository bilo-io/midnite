import { Inject, Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm/llm.service';

// Where a freshly-submitted item should land. The plan model triages freeform
// input: actionable now → todo (the pool picks it up); too vague / needs
// breaking down first → backlog.

const TRIAGE_SCHEMA = {
  type: 'object' as const,
  properties: {
    ready: {
      type: 'boolean',
      description:
        'true if the task is concrete and actionable now (→ todo); false if it is vague, ' +
        'a rough idea, or needs breaking down first (→ backlog).',
    },
  },
  required: ['ready'],
};

const TASK_PLAN_SYSTEM_PROMPT =
  'You are midnite\'s planner. Decide whether a submitted item is ready for an ' +
  'autonomous coding agent to start on immediately. Ready means it states a ' +
  'concrete, self-contained change or question. Not ready means it is a vague ' +
  'idea, a large epic needing decomposition, or missing essential detail. Call ' +
  'the triage tool with your decision.';

const TASK_ANSWER_SYSTEM_PROMPT =
  "You are midnite's assistant. The user submitted a question rather than a unit " +
  'of work. Answer it directly and concisely in plain Markdown — no preamble. If ' +
  'you genuinely cannot answer it without more context (e.g. it needs the actual ' +
  'codebase), say so briefly in one sentence instead of guessing.';

/** Cap on a generated inline answer — long enough to be useful, bounded for cost. */
const ANSWER_MAX_TOKENS = 800;

const REPO_GUESS_SYSTEM_PROMPT =
  "You are midnite's planner. Given a coding task and the list of repositories " +
  'this user works on, pick the single repository the task most likely targets. ' +
  'Match on the repo name and the project its filesystem path implies. Return the ' +
  'exact name from the list, copied verbatim. If no repository clearly fits — the ' +
  'task is generic, ambiguous, or unrelated to any listed repo — return an empty ' +
  'string rather than guessing.';

/**
 * Plan-model triage at task creation. Uses the (heavier) plan model to decide a
 * task's landing column. Fail-soft: when AI is disabled or the call errors it
 * defaults to ready (todo), so task creation never breaks on the planner.
 */
@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(@Inject(LlmService) private readonly llm: LlmService) {}

  async triage(prompt: string): Promise<{ ready: boolean }> {
    if (!this.llm.enabled) return { ready: true };
    try {
      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getPlanModel(),
          maxTokens: 128,
          system: TASK_PLAN_SYSTEM_PROMPT,
          schema: TRIAGE_SCHEMA,
          schemaName: 'triage',
          schemaDescription: 'Record whether the task is ready to be worked on now.',
          messages: [{ role: 'user', text: prompt }],
        },
        'planner',
      );
      const ready =
        typeof data === 'object' && data !== null && 'ready' in data
          ? (data as { ready: unknown }).ready
          : undefined;
      // Default to ready unless the model explicitly said false.
      return { ready: ready === false ? false : true };
    } catch (err) {
      this.logger.warn(
        `planner triage failed (${err instanceof Error ? err.message : 'unknown'}); defaulting to ready`,
      );
      return { ready: true };
    }
  }

  /**
   * Generate a direct answer to a question-kind task on the plan model, so a
   * "how do I…?" item is resolved inline instead of queued for an agent. Returns
   * the answer text, or null when AI is disabled, the call fails, or the model
   * returns nothing — callers treat null as "couldn't answer, fall back to the
   * normal queue" (fail-soft, like {@link triage}).
   */
  async answer(prompt: string): Promise<string | null> {
    if (!this.llm.enabled) return null;
    try {
      const { text } = await this.llm.generateText(
        {
          model: this.llm.getPlanModel(),
          maxTokens: ANSWER_MAX_TOKENS,
          system: TASK_ANSWER_SYSTEM_PROMPT,
          messages: [{ role: 'user', text: prompt }],
        },
        'planner',
      );
      const trimmed = text.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch (err) {
      this.logger.warn(
        `planner answer failed (${err instanceof Error ? err.message : 'unknown'}); leaving the question queued`,
      );
      return null;
    }
  }

  /**
   * Guess which registered repo a task targets, on the plan model (Phase 4 /
   * outstanding #5). Returns the matched repo name, or `null` when there's
   * nothing to infer from (AI disabled, empty registry) or no clear match.
   * Fail-soft like {@link triage}: a failed guess just leaves the task
   * unassigned, never breaking creation. Only called when the caller didn't
   * name a repo.
   *
   * The returned name is always one the registry knows — it's validated against
   * the passed manifest, so the model can never introduce a dangling reference.
   * A single registered repo is returned without an LLM call (it's the only
   * possible target).
   */
  async guessRepo(
    prompt: string,
    repos: Array<{ name: string; path: string }>,
  ): Promise<string | null> {
    if (!this.llm.enabled || repos.length === 0) return null;
    if (repos.length === 1) return repos[0]!.name;
    const names = repos.map((r) => r.name);
    try {
      const manifest = repos.map((r) => `- ${r.name} — ${r.path}`).join('\n');
      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getPlanModel(),
          maxTokens: 128,
          system: REPO_GUESS_SYSTEM_PROMPT,
          schema: {
            type: 'object' as const,
            properties: {
              repo: {
                type: 'string',
                enum: [...names, ''],
                description:
                  'The exact name of the repository this task targets, copied from the ' +
                  'list. Empty string if none clearly applies.',
              },
            },
            required: ['repo'],
          },
          schemaName: 'repo_guess',
          schemaDescription: 'Record which registered repo the task targets, if any.',
          messages: [{ role: 'user', text: `Repositories:\n${manifest}\n\nTask:\n${prompt}` }],
        },
        'planner',
      );
      const guess =
        typeof data === 'object' && data !== null && 'repo' in data
          ? (data as { repo: unknown }).repo
          : undefined;
      // Accept only a name the registry actually knows — never persist a
      // dangling reference if the model returns something off-list or empty.
      return typeof guess === 'string' && names.includes(guess) ? guess : null;
    } catch (err) {
      this.logger.warn(
        `planner repo guess failed (${err instanceof Error ? err.message : 'unknown'}); leaving the task unassigned`,
      );
      return null;
    }
  }
}
