import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionSummary, SessionTranscript } from '@midnite/shared';
import { TasksService } from '../tasks/tasks.service';
import { listSessions, loadTranscript } from './sessions.reader';

@Injectable()
export class SessionsService {
  constructor(
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  async list(): Promise<SessionSummary[]> {
    const summaries = await listSessions();
    const tasks = this.tasks.listTasks();
    const bySessionId = new Map<string, string>();
    for (const t of tasks) {
      if (t.sessionId) bySessionId.set(t.sessionId, t.id);
    }
    if (bySessionId.size === 0) return summaries;
    return summaries.map((s) => {
      const linkedTaskId = bySessionId.get(s.id);
      return linkedTaskId ? { ...s, linkedTaskId } : s;
    });
  }

  async transcript(projectSlug: string, sessionId: string): Promise<SessionTranscript> {
    let transcript: SessionTranscript;
    try {
      transcript = await loadTranscript(projectSlug, sessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      throw new NotFoundException(message);
    }

    const linkedTask = this.tasks
      .listTasks()
      .find((t) => t.sessionId === sessionId);
    if (linkedTask) {
      return { ...transcript, taskEvents: linkedTask.events };
    }
    return transcript;
  }
}
