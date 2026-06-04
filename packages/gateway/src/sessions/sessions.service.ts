import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  SessionStatus,
  SessionSummary,
  SessionTranscript,
  Status,
  Task,
  TranscriptMessage,
} from '@midnite/shared';
import { TasksService } from '../tasks/tasks.service';
import { loadTranscript } from './sessions.reader';

const SUBTITLE_LIMIT = 140;

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
  constructor(@Inject(TasksService) private readonly tasks: TasksService) {}

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
    };
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
