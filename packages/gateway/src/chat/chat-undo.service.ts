import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ChatCommandResult, type ChatInferencePath, type TeamScope } from '@midnite/shared';

import { AuditService } from '../audit/audit.service';
import { TasksService } from '../tasks/tasks.service';
import { ChatCommandsRepository } from './chat-commands.repository';
import { applyRevert, type RevertOp } from './lib/revert-plan';

/**
 * Phase 59 F — undo a previously executed chat command by replaying its inverse
 * {@link RevertOp} plan through the existing TasksService mutators (no new
 * mutation path). One-shot: the log row is marked `undoneAt` so a token can't be
 * replayed twice. Like the command path, it never throws for user input — an
 * unknown/expired token or an already-undone command returns a spoken result.
 */
@Injectable()
export class ChatUndoService {
  private readonly logger = new Logger(ChatUndoService.name);

  constructor(
    @Inject(ChatCommandsRepository) private readonly log: ChatCommandsRepository,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  undo(undoToken: string, scope?: TeamScope): ChatCommandResult {
    const row = this.log.getById(undoToken, scope);
    if (!row) return done('Nothing to undo — that command is unknown or not yours.');
    if (row.undoneAt) return done('That command was already undone.');

    const path = row.inferencePath as ChatInferencePath;
    const ops = safeParseOps(row.revertPlan);
    const affectedIds = safeParseIds(row.affectedIds);

    let reverted = 0;
    let failed = 0;
    // Replay in order; a single already-gone task shouldn't abort the whole undo.
    for (const op of ops) {
      try {
        applyRevert(this.tasks, op);
        reverted += 1;
      } catch (err) {
        failed += 1;
        this.logger.warn(`chat undo op (${op.kind}) failed: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    this.log.markUndone(undoToken, new Date().toISOString());
    this.audit.record({
      entityType: 'task',
      entityId: affectedIds[0] ?? 'chat',
      userId: scope?.userId ?? null,
      action: 'chat.undo',
      payload: { undoToken, intentType: row.intentType, reverted, failed },
    });

    const summary =
      `Reverted ${reverted} change${reverted === 1 ? '' : 's'}` + (failed > 0 ? ` (${failed} could not be reverted).` : '.');
    // Undo isn't itself undoable → no undoToken; confirmation always 'none'.
    return { summary, affectedIds, inferencePath: path, confirmation: 'none' };
  }
}

function safeParseOps(json: string): RevertOp[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as RevertOp[]) : [];
  } catch {
    return [];
  }
}

function safeParseIds(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function done(summary: string): ChatCommandResult {
  return { summary, affectedIds: [], inferencePath: 'deterministic', confirmation: 'none' };
}
