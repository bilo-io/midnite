import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { detectSourceKind, type Status, type Task, type TaskCounts } from '@midnite/shared';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import { TasksRepository } from './tasks.repository';

export interface CreateTaskInput {
  prompt: string;
  repo?: string;
  /** Where the task should land. Defaults to 'todo' (picked up as agents free up). */
  status?: Status;
  images: Array<ClassifierImage & { size: number; originalName?: string }>;
}

@Injectable()
export class TasksService {
  constructor(
    @Inject(TasksRepository) private readonly repo: TasksRepository,
    @Inject(TaskClassifier) private readonly classifier: TaskClassifier,
  ) {}

  getCounts(): TaskCounts {
    const raw = this.repo.countsByStatus();
    return {
      backlog: raw.backlog,
      todo: raw.todo,
      inProgress: raw.wip + raw.waiting,
      done: raw.done,
    };
  }

  listTasks(status?: Status, projectId?: string): Task[] {
    return this.repo.listTasks(status, projectId).map((r) => this.repo.hydrate(r));
  }

  getTask(id: string): Task {
    const row = this.repo.getTask(id);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    return this.repo.hydrate(row);
  }

  updateStatus(id: string, status: Status): Task {
    const now = new Date().toISOString();
    const row = this.repo.updateStatus(id, status, now);
    if (!row) throw new NotFoundException(`task ${id} not found`);
    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'status.changed',
      data: JSON.stringify({ status }),
    });
    return this.repo.hydrate(row);
  }

  async createFromPrompt(input: CreateTaskInput): Promise<Task> {
    const classified = await this.classifier.classify(
      input.prompt,
      input.images.map((i) => ({ path: i.path, mime: i.mime })),
    );

    const id = randomUUID();
    const now = new Date().toISOString();

    this.repo.insertTask({
      id,
      title: classified.title,
      kind: classified.kind,
      status: input.status ?? 'todo',
      prompt: input.prompt,
      repo: input.repo ?? null,
      agentId: null,
      sessionId: null,
      prUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    for (const image of input.images) {
      this.repo.insertAttachment({
        id: randomUUID(),
        taskId: id,
        path: image.path,
        mime: image.mime,
        size: image.size,
        originalName: image.originalName ?? null,
        createdAt: now,
      });
    }

    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'task.created',
      data: JSON.stringify({
        promptLength: input.prompt.length,
        attachments: input.images.length,
      }),
    });

    return this.getTask(id);
  }

  // Create a task directly from a plan checklist item: explicit title, tagged to
  // the project, no AI classification (deterministic and cheap).
  createForProject(input: { projectId: string; title: string }): Task {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.repo.insertTask({
      id,
      title: input.title,
      kind: 'unknown',
      status: 'todo',
      prompt: null,
      repo: null,
      agentId: null,
      sessionId: null,
      projectId: input.projectId,
      prUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    this.repo.insertEvent({
      id: randomUUID(),
      taskId: id,
      at: now,
      kind: 'task.created',
      data: JSON.stringify({ projectId: input.projectId, source: 'plan' }),
    });

    return this.getTask(id);
  }

  addLink(taskId: string, url: string, label?: string): Task {
    this.getTask(taskId); // 404s if the task is missing
    const now = new Date().toISOString();
    this.repo.insertLink({
      id: randomUUID(),
      taskId,
      url,
      kind: detectSourceKind(url),
      label: label ?? null,
      createdAt: now,
    });
    this.repo.insertEvent({
      id: randomUUID(),
      taskId,
      at: now,
      kind: 'link.added',
      data: JSON.stringify({ url }),
    });
    return this.getTask(taskId);
  }

  removeLink(taskId: string, linkId: string): Task {
    this.getTask(taskId);
    if (!this.repo.getLink(taskId, linkId)) {
      throw new NotFoundException(`link ${linkId} not found`);
    }
    this.repo.deleteLink(taskId, linkId);
    return this.getTask(taskId);
  }
}
