import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CLI_PROVIDER_MAP,
  TERMINAL_WS_PATH,
  type LlmProvider,
  type SessionStatus,
  type SessionSummary,
  type SessionTranscript,
  type Status,
  type Task,
  type TerminalTokenResponse,
  type TranscriptMessage,
} from '@midnite/shared';
import { AgentsService } from '../agents/agents.service';
import { TasksService } from '../tasks/tasks.service';
import { TerminalService } from '../terminal/terminal.service';
import { loadTranscript } from './sessions.reader';

const SUBTITLE_LIMIT = 140;
const CONTEXT_LIMIT = 200_000;

// A session is the work behind a task, so its status follows the task's.
const STATUS_MAP: Record<Status, SessionStatus> = {
  backlog: 'idle',
  todo: 'idle',
  wip: 'running',
  waiting: 'waiting',
  done: 'completed',
  abandoned: 'idle',
};

@Injectable()
export class SessionsService {
  constructor(
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(TerminalService) private readonly terminal: TerminalService,
    @Inject(AgentsService) private readonly agents: AgentsService,
  ) {}

  // The provider behind every session right now: midnite runs one configured
  // agent CLI globally, so we map that CLI → provider (claude→anthropic, …).
  // Provider-less CLIs (aider) yield undefined. A per-session provider can
  // replace this later without changing the wire shape.
  private currentProvider(): LlmProvider | undefined {
    return CLI_PROVIDER_MAP[this.agents.getAgentCli()] ?? undefined;
  }

  // Mint a short-lived, single-use token the web client presents on the WS
  // `attach` — the trust boundary for driving a PTY (arbitrary code in a repo).
  mintTerminalToken(sessionId: string): TerminalTokenResponse {
    const task = this.tasks.listTasks().find((t) => t.id === sessionId);
    // Mint for a real session/task, a registered ad-hoc terminal (CLI installs),
    // or a live managed-run PTY (council participants) — all attach over the
    // same WS flow.
    if (!task && !this.terminal.hasAdHoc(sessionId) && !this.terminal.has(sessionId)) {
      throw new NotFoundException(`session ${sessionId} not found`);
    }
    return { token: this.terminal.mintToken(sessionId), wsUrl: TERMINAL_WS_PATH };
  }

  // One session per task (most-recently-touched first), rather than every raw
  // ~/.claude transcript on disk.
  async list(): Promise<SessionSummary[]> {
    return this.tasks
      .listTasks()
      .map((t) => this.toSummary(t))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }

  async transcript(projectSlug: string, sessionId: string): Promise<SessionTranscript> {
    const task = this.tasks.listTasks().find((t) => t.id === sessionId);
    if (task) return this.synthesize(task);

    // Fallback for any externally-linked, on-disk session id.
    try {
      return await loadTranscript(projectSlug, sessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      throw new NotFoundException(message);
    }
  }

  private toSummary(task: Task): SessionSummary {
    return {
      id: task.id,
      projectSlug: 'task',
      projectDisplay: task.repo ?? 'midnite',
      title: task.title,
      subtitle: truncate((task.prompt ?? '').replace(/\s+/g, ' ').trim(), SUBTITLE_LIMIT),
      status: STATUS_MAP[task.status],
      lastActivity: toMs(task.updatedAt ?? task.createdAt),
      linkedTaskId: task.id,
      contextTokens: deriveContextTokens(task),
      contextLimit: CONTEXT_LIMIT,
      archivedAt: task.archivedAt,
      provider: this.currentProvider(),
    };
  }

  // A session is a view over its task, so archiving/unarchiving delegates to the
  // task layer (the dependency graph only flows sessions -> tasks).
  archive(sessionId: string): SessionSummary {
    return this.toSummary(this.tasks.archive(sessionId));
  }

  unarchive(sessionId: string): SessionSummary {
    return this.toSummary(this.tasks.unarchive(sessionId));
  }

  // Deleting a session permanently removes its underlying task; gated on the task
  // already being archived (enforced by the task layer).
  delete(sessionId: string): void {
    this.tasks.deleteTask(sessionId);
  }

  private synthesize(task: Task): SessionTranscript {
    const messages: TranscriptMessage[] = [];
    if (task.prompt) {
      messages.push({
        uuid: `${task.id}-prompt`,
        role: 'user',
        timestamp: toMs(task.createdAt),
        text: task.prompt,
      });
    }
    return {
      id: task.id,
      title: task.title,
      projectDisplay: task.repo ?? 'midnite',
      status: STATUS_MAP[task.status],
      messages,
      taskEvents: task.events,
    };
  }
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return value.slice(0, limit - 1).trimEnd() + '…';
}

function toMs(iso: string | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

// Placeholder context-window usage until real token tracking exists: a stable
// per-task value with a plausible spread (seeded by id, nudged by prompt size
// and how far along the task is).
function deriveContextTokens(task: Task): number {
  let hash = 0;
  for (let i = 0; i < task.id.length; i++) {
    hash = (hash * 31 + task.id.charCodeAt(i)) >>> 0;
  }
  const base = hash % 60; // 0..59
  const promptBump = Math.min(20, Math.floor((task.prompt?.length ?? 0) / 80));
  const statusBump = task.status === 'done' ? 16 : task.status === 'wip' ? 10 : 0;
  const percent = Math.min(96, 6 + base + promptBump + statusBump);
  return Math.round(CONTEXT_LIMIT * (percent / 100));
}
