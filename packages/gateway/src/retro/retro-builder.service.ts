import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TaskRetroSchema, type RetroNarrative, type Task, type TaskRetro } from '@midnite/shared';

import { RetroRepository } from './retro.repository';
import { buildRetro } from './lib/build-retro';
import { buildTaskRetroReport, retroReportFilename } from './lib/retro-report';

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

  /**
   * Attach an LLM narrative to a task's stored retro (Phase 62 C). No-op when no
   * skeleton exists yet (the narrative rides on the deterministic skeleton). Flips
   * `hasNarrative` to 1; preserves the original `createdAt`.
   */
  storeNarrative(taskId: string, narrative: RetroNarrative): TaskRetro | undefined {
    const existing = this.getByTaskId(taskId);
    if (!existing) return undefined;
    const updated: TaskRetro = { ...existing, narrative };
    const now = new Date().toISOString();
    this.repo.upsert({
      id: randomUUID(),
      taskId,
      outcome: updated.outcome,
      hasNarrative: 1,
      retro: JSON.stringify(updated),
      createdAt: existing.createdAt,
      updatedAt: now,
    });
    return updated;
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

  /**
   * Serialize a task's retrospective as a downloadable markdown report (Phase 62
   * F). The caller passes the already-scoped `task` (so scope-checking stays in
   * the controller, like tasks' export); throws {@link NotFoundException} when no
   * retro has been built for it.
   */
  exportMarkdown(task: Task): { filename: string; markdown: string } {
    const retro = this.getByTaskId(task.id);
    if (!retro) throw new NotFoundException(`no retrospective for task ${task.id}`);
    return {
      filename: retroReportFilename(task),
      markdown: buildTaskRetroReport(task, retro),
    };
  }
}
