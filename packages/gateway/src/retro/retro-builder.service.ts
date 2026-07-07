import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { TaskRetroSchema, type Task, type TaskRetro } from '@midnite/shared';

import { RetroRepository } from './retro.repository';
import { buildRetro } from './lib/build-retro';

/**
 * Phase 62 A — assembles + stores the deterministic retro skeleton for a task.
 * Pure assembly lives in {@link buildRetro}; this service wires the repo reads,
 * upserts the one row per task, and reads it back for the API. No LLM.
 */
@Injectable()
export class RetroBuilderService {
  private readonly logger = new Logger(RetroBuilderService.name);

  constructor(@Inject(RetroRepository) private readonly repo: RetroRepository) {}

  /** Assemble the skeleton for a terminal task (no persistence). */
  build(task: Task): TaskRetro {
    return buildRetro(
      task,
      {
        events: this.repo.events(task.id),
        runStats: this.repo.runStats(task.id),
        failures: this.repo.failures(task.id),
        checkRuns: this.repo.checkRuns(task.id),
      },
      new Date().toISOString(),
    );
  }

  /** Build + upsert the retro row (one per task; re-terminal updates it). */
  buildAndStore(task: Task): TaskRetro {
    const retro = this.build(task);
    const now = retro.createdAt;
    this.repo.upsert({
      id: randomUUID(),
      taskId: task.id,
      outcome: retro.outcome,
      hasNarrative: retro.narrative ? 1 : 0,
      retro: JSON.stringify(retro),
      createdAt: now,
      updatedAt: now,
    });
    return retro;
  }

  /** The stored retro for a task, or undefined if none has been built. */
  getByTaskId(taskId: string): TaskRetro | undefined {
    const row = this.repo.getByTaskId(taskId);
    if (!row) return undefined;
    let raw: unknown;
    try {
      raw = JSON.parse(row.retro);
    } catch {
      this.logger.warn(`stored retro for task ${taskId} is not valid JSON — ignored`);
      return undefined;
    }
    const parsed = TaskRetroSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn(`stored retro for task ${taskId} failed validation: ${parsed.error.message}`);
      return undefined;
    }
    return parsed.data;
  }
}
