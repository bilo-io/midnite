import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CHAT_QUERY_TASK_CAP,
  type ChatQueryAnswer,
  type ChatTaskRef,
  type QueryIntent,
  type QueryRead,
  type Status,
  type TaskGraphNode,
  type TeamScope,
} from '@midnite/shared';

import { LlmService } from '../agent/llm/llm.service';
import { TasksService } from '../tasks/tasks.service';
import { CHAT_QUERY_SYSTEM_PROMPT } from './chat.prompts';

/** Board-facing label for a status column (only `wip` differs from the raw word). */
const STATUS_WORD: Record<Status, string> = {
  backlog: 'backlog',
  todo: 'todo',
  wip: 'in-progress',
  waiting: 'waiting',
  done: 'done',
  abandoned: 'abandoned',
};

/** JSON schema for the free-form summary tool call (one prose string). */
const CHAT_QUERY_LLM_SCHEMA = {
  type: 'object' as const,
  properties: { summary: { type: 'string', description: 'A concise answer to the question, grounded in the board state.' } },
  required: ['summary'],
};

/**
 * Phase 59 C — the **read-only** board query answerer. A `query` intent with a
 * deterministic `read` (from the grammar) is answered with zero inference by
 * filtering the server-authoritative dependency graph (which already computes
 * `ready`/`unmetBlockerCount` the same way the scheduler does — so answers can't
 * drift from the board). A free-form question (no `read`) gets a cheap LLM
 * summary over the actionable slice, and **fails soft** to a deterministic
 * overview when no provider is configured or the call errors. Never mutates.
 */
@Injectable()
export class ChatQueryService {
  private readonly logger = new Logger(ChatQueryService.name);

  constructor(
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  async answer(intent: QueryIntent, scope?: TeamScope, signal?: AbortSignal): Promise<ChatQueryAnswer> {
    return intent.read
      ? this.answerRead(intent.read, scope)
      : this.answerFreeform(intent.text, scope, signal);
  }

  /** Deterministic filter read — no LLM. Filters the (scoped) graph nodes. */
  private answerRead(read: QueryRead, scope?: TeamScope): ChatQueryAnswer {
    const graph = this.tasks.buildGraph(undefined, scope);
    // Foreign nodes are cross-project blocker context, not board tasks — exclude.
    let nodes = graph.nodes.filter((n) => !n.foreign);
    if (read.status) nodes = nodes.filter((n) => n.status === read.status);
    if (read.blocked) nodes = nodes.filter((n) => n.unmetBlockerCount > 0);
    if (read.ready) nodes = nodes.filter((n) => n.ready);

    const count = nodes.length;
    const noun = describeRead(read);
    // The graph is priority-desc / age-asc already (it slices listTasks), so the
    // first N are the ones that matter most.
    const capped = nodes.slice(0, CHAT_QUERY_TASK_CAP).map(toRef);
    // `truncated` covers both a >cap match set and a graph that hit its own node
    // cap (so `count` itself may undercount — flagged, never silent).
    const truncated = graph.truncated || count > capped.length;

    if (read.metric === 'count') {
      const text = `${graph.truncated ? `${count}+` : count} ${noun} ${count === 1 ? 'task' : 'tasks'}.`;
      return { text, tasks: [], count, truncated, inferencePath: 'deterministic' };
    }
    const text =
      count === 0
        ? `No ${noun} tasks.`
        : `${count} ${noun} ${count === 1 ? 'task' : 'tasks'}${count > capped.length ? ` (showing the first ${capped.length})` : ''}.`;
    return { text, tasks: capped, count, truncated, inferencePath: 'deterministic' };
  }

  /**
   * Free-form question → a cheap LLM summary over the actionable slice (ready +
   * blocked, priority-ordered). Fails soft to a deterministic overview when the
   * provider is off/erroring, so the answerer always returns something useful.
   */
  private async answerFreeform(text: string, scope?: TeamScope, signal?: AbortSignal): Promise<ChatQueryAnswer> {
    const graph = this.tasks.buildGraph(undefined, scope);
    const nodes = graph.nodes.filter((n) => !n.foreign);
    const ready = nodes.filter((n) => n.ready);
    const blocked = nodes.filter((n) => n.unmetBlockerCount > 0);
    // Deep-link slice: the actionable set (ready + blocked), else the top tasks.
    const sliceNodes = (ready.length || blocked.length ? [...ready, ...blocked] : nodes).slice(
      0,
      CHAT_QUERY_TASK_CAP,
    );
    const tasks = sliceNodes.map(toRef);
    const truncated = graph.truncated || ready.length + blocked.length > sliceNodes.length;
    const overview = boardOverview(nodes, ready, blocked);

    if (!this.llm.enabled) {
      return { text: overview, tasks, count: tasks.length, truncated, inferencePath: 'deterministic' };
    }

    try {
      const context = boardContext(nodes, ready, blocked);
      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getActModel(),
          maxTokens: 400,
          system: CHAT_QUERY_SYSTEM_PROMPT,
          schema: CHAT_QUERY_LLM_SCHEMA,
          schemaName: 'record_answer',
          schemaDescription: 'Answer the board question in one concise summary.',
          messages: [{ role: 'user', text: `Question: ${text}\n\nBoard state:\n${context}` }],
          signal,
        },
        'chat',
      );
      const summary = typeof (data as { summary?: unknown })?.summary === 'string' ? (data as { summary: string }).summary.trim() : '';
      if (!summary) return { text: overview, tasks, count: tasks.length, truncated, inferencePath: 'deterministic' };
      // local-vs-provider distinction is Theme D's routing concern; report `provider`.
      return { text: summary, tasks, count: tasks.length, truncated, inferencePath: 'provider' };
    } catch (err) {
      this.logger.warn(
        `chat query summary failed (${err instanceof Error ? err.message : 'unknown'}); returning deterministic overview`,
      );
      return { text: overview, tasks, count: tasks.length, truncated, inferencePath: 'deterministic' };
    }
  }
}

function toRef(n: TaskGraphNode): ChatTaskRef {
  return { id: n.id, title: n.title, status: n.status, priority: n.priority };
}

/** Human phrase for a deterministic read ("blocked", "ready todo", "in-progress"). */
function describeRead(read: QueryRead): string {
  const parts: string[] = [];
  if (read.blocked) parts.push('blocked');
  if (read.ready) parts.push('ready');
  if (read.status) parts.push(STATUS_WORD[read.status]);
  return parts.length ? parts.join(' ') : 'total';
}

/** A one-line deterministic board summary — the fail-soft answer for free-form. */
function boardOverview(all: TaskGraphNode[], ready: TaskGraphNode[], blocked: TaskGraphNode[]): string {
  const wip = all.filter((n) => n.status === 'wip').length;
  return `Board: ${all.length} ${all.length === 1 ? 'task' : 'tasks'} — ${ready.length} ready, ${wip} in-progress, ${blocked.length} blocked.`;
}

/** Compact board state fed to the LLM — capped so the prompt stays cheap. */
function boardContext(all: TaskGraphNode[], ready: TaskGraphNode[], blocked: TaskGraphNode[]): string {
  const counts = new Map<Status, number>();
  for (const n of all) counts.set(n.status, (counts.get(n.status) ?? 0) + 1);
  const countsLine = [...counts.entries()].map(([s, c]) => `${STATUS_WORD[s]}=${c}`).join(', ');
  const line = (n: TaskGraphNode) => `- [${n.id}] "${n.title}" (p${n.priority}${n.unmetBlockerCount > 0 ? `, ${n.unmetBlockerCount} unmet blockers` : ''})`;
  const readySlice = ready.slice(0, 20).map(line).join('\n') || '(none)';
  const blockedSlice = blocked.slice(0, 20).map(line).join('\n') || '(none)';
  return `Counts: ${countsLine}\n\nReady to start:\n${readySlice}\n\nBlocked:\n${blockedSlice}`;
}
