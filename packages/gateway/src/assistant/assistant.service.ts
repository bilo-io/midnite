import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type AssistantBlock,
  type AssistantQueryResponse,
  coerceAssistantBlock,
  type Status,
  type TaskGraphNode,
  type TeamScope,
} from '@midnite/shared';

import { LlmService } from '../agent/llm/llm.service';
import { MetricsService } from '../metrics/metrics.service';
import { AgentPoolService } from '../pool/agent-pool.service';
import { SessionsService } from '../sessions/sessions.service';
import { TasksService } from '../tasks/tasks.service';
import { ASSISTANT_SYSTEM_PROMPT } from './assistant.prompts';

/** How many tasks/sessions/activity rows to feed the model — keeps the prompt cheap. */
const ASSISTANT_TASK_CAP = 20;
const ASSISTANT_SESSION_CAP = 10;
const ASSISTANT_ACTIVITY_CAP = 8;

const STATUS_WORD: Record<Status, string> = {
  backlog: 'backlog',
  todo: 'todo',
  wip: 'in-progress',
  waiting: 'waiting',
  done: 'done',
  abandoned: 'abandoned',
};

/**
 * Loose structured-output schema: the model returns `blocks`, each a superset of
 * every block variant (kind + optional text/name/props). Strict per-variant
 * validation + downgrade-to-markdown happens in {@link coerceAssistantBlock}, so
 * a malformed block never breaks the answer.
 */
const ASSISTANT_LLM_SCHEMA = {
  type: 'object' as const,
  properties: {
    blocks: {
      type: 'array',
      description: 'Ordered answer blocks (markdown prose and/or inline components).',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['markdown', 'component'] },
          text: { type: 'string', description: 'Prose (for kind=markdown).' },
          name: {
            type: 'string',
            enum: ['task-card', 'fleet-gauge', 'session-list', 'sparkline'],
            description: 'Component name (for kind=component).',
          },
          props: { type: 'object', description: 'Component props (a reference like a taskId).' },
        },
        required: ['kind'],
      },
    },
  },
  required: ['blocks'],
};

/**
 * Phase 66 E — the **read-only fleet assistant**. Composes the existing read
 * paths (task counts + dependency graph + recent activity, active sessions, the
 * agent-pool snapshot, live ops gauges + cycle-time) into a compact context, then
 * asks {@link LlmService} to answer as an ordered list of {@link AssistantBlock}s
 * (markdown + inline components). It **never mutates** and **fails soft** to a
 * deterministic overview when no provider is configured or the call errors — so
 * the assistant always returns something useful, mirroring `ChatQueryService`.
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(AgentPoolService) private readonly pool: AgentPoolService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  async answer(question: string, scope?: TeamScope, signal?: AbortSignal): Promise<AssistantQueryResponse> {
    const context = await this.buildContext(scope);

    if (!this.llm.enabled) {
      return { blocks: [{ kind: 'markdown', text: context.overview }], inferencePath: 'deterministic' };
    }

    try {
      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getActModel(),
          maxTokens: 700,
          system: ASSISTANT_SYSTEM_PROMPT,
          schema: ASSISTANT_LLM_SCHEMA,
          schemaName: 'record_answer',
          schemaDescription: 'Answer the fleet question as ordered blocks.',
          messages: [{ role: 'user', text: `Question: ${question}\n\nFleet context:\n${context.text}` }],
          signal,
        },
        'assistant',
      );
      const rawBlocks = Array.isArray((data as { blocks?: unknown })?.blocks)
        ? ((data as { blocks: unknown[] }).blocks)
        : [];
      const blocks = rawBlocks
        .map((b) => coerceAssistantBlock(b))
        .filter((b): b is AssistantBlock => b !== null);
      if (blocks.length === 0) {
        return { blocks: [{ kind: 'markdown', text: context.overview }], inferencePath: 'deterministic' };
      }
      return { blocks, inferencePath: 'provider' };
    } catch (err) {
      this.logger.warn(
        `assistant answer failed (${err instanceof Error ? err.message : 'unknown'}); returning deterministic overview`,
      );
      return { blocks: [{ kind: 'markdown', text: context.overview }], inferencePath: 'deterministic' };
    }
  }

  /** Assemble the (bounded) fleet context — the prompt payload + a fail-soft overview line. */
  private async buildContext(scope?: TeamScope): Promise<{ text: string; overview: string }> {
    const counts = this.tasks.getCounts();
    const graph = this.tasks.buildGraph(undefined, scope);
    const nodes = graph.nodes.filter((n) => !n.foreign);
    const ready = nodes.filter((n) => n.ready);
    const blocked = nodes.filter((n) => n.unmetBlockerCount > 0);
    const activity = this.tasks.recentActivity(scope, ASSISTANT_ACTIVITY_CAP);
    const poolSnap = this.pool.snapshot();

    // Sessions + metrics are independent reads — fetch concurrently.
    const [allSessions] = await Promise.all([this.sessions.list(scope)]);
    const activeSessions = allSessions.filter((s) => !s.archivedAt).slice(0, ASSISTANT_SESSION_CAP);

    const ops = this.metrics.getOpsSummary({});
    const cycle = this.metrics.getCycleTime({ windowDays: 14, groupBy: 'none' });
    const cycleAll = cycle.groups[0];

    const line = (n: TaskGraphNode) =>
      `- [${n.id}] "${n.title}" (${STATUS_WORD[n.status]}, p${n.priority}${n.unmetBlockerCount > 0 ? `, ${n.unmetBlockerCount} unmet blockers` : ''})`;
    const readySlice = ready.slice(0, ASSISTANT_TASK_CAP).map(line).join('\n') || '(none)';
    const blockedSlice = blocked.slice(0, ASSISTANT_TASK_CAP).map(line).join('\n') || '(none)';
    const sessionLines =
      activeSessions.map((s) => `- [${s.id}] ${s.title} (${s.status})`).join('\n') || '(none active)';
    const activityLines =
      activity.map((a) => `- [${a.taskId}] ${a.title} (${a.kind}) @ ${a.at}`).join('\n') || '(none)';

    const overview = `Board: ${nodes.length} ${nodes.length === 1 ? 'task' : 'tasks'} — ${ready.length} ready, ${counts.inProgress} in-progress, ${blocked.length} blocked, ${counts.done} done. ${poolSnap.busy}/${poolSnap.capacity} agent slots busy, ${activeSessions.length} active session${activeSessions.length === 1 ? '' : 's'}.`;

    const text = [
      `Counts: backlog=${counts.backlog}, todo=${counts.todo}, in-progress=${counts.inProgress}, done=${counts.done}`,
      `Agent pool: ${poolSnap.busy}/${poolSnap.capacity} slots busy, ${poolSnap.queuedTodo} queued`,
      `Ops gauges: queueDepth=${ops.gauges.queueDepth ?? 'n/a'}, slots=${ops.gauges.slotsUsed ?? 'n/a'}/${ops.gauges.slotsTotal ?? 'n/a'}`,
      cycleAll
        ? `Cycle time (14d, ${cycleAll.taskCount} tasks): end-to-end p50 ${cycleAll.endToEnd.p50Ms ?? 'n/a'}ms`
        : 'Cycle time (14d): no completed tasks',
      ``,
      `Ready to start:\n${readySlice}`,
      ``,
      `Blocked:\n${blockedSlice}`,
      ``,
      `Active sessions:\n${sessionLines}`,
      ``,
      `Recent activity:\n${activityLines}`,
    ].join('\n');

    return { text, overview };
  }
}
