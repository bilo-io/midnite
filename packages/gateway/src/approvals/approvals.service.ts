import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import {
  SAFE_TOOLS,
  type ApprovalDecidedBy,
  type ApprovalLogResolution,
  type ApprovalRule,
  type ApprovalRuleMatch,
  type ApprovalSettings,
  type AutonomyMode,
  type CreateApprovalRule,
  type UpdateApprovalRule,
} from '@midnite/shared';
import type { ApprovalRuleRow } from '../db/schema';
import { evaluateRules, type EvaluationVerdict } from './lib/rule-evaluator';
import { ApprovalLogRepository } from './approval-log.repository';
import { ApprovalsRepository } from './approvals.repository';

/** Business logic for approval rules + autonomy mode.
 *  Mode is persisted in `approval_settings` (single row) and cached in memory. */
@Injectable()
export class ApprovalsService implements OnModuleInit {
  private mode: AutonomyMode = 'manual';

  constructor(
    @Inject(ApprovalsRepository) private readonly repo: ApprovalsRepository,
    @Optional() @Inject(ApprovalLogRepository) private readonly logRepo?: ApprovalLogRepository,
  ) {}

  onModuleInit(): void {
    const row = this.repo.getSettings();
    if (row) this.mode = row.mode as AutonomyMode;
  }

  // ---- mode ----

  getMode(): AutonomyMode {
    return this.mode;
  }

  setMode(mode: AutonomyMode): void {
    this.mode = mode;
    this.repo.upsertMode(mode, new Date().toISOString());
  }

  getSettings(): ApprovalSettings {
    return { mode: this.mode, safeTools: [...SAFE_TOOLS] };
  }

  /** Evaluate durable rules against a tool call.
   *  `manual` → always escalate (no behaviour change for existing users).
   *  `guarded` → auto-allow SAFE_TOOLS, then consult rules.
   *  `autonomous` → rules decide; fail-safe is escalate on no match. */
  evaluate(toolName: string, toolInput: unknown): EvaluationVerdict {
    if (this.mode === 'manual') return 'escalate';
    if (this.mode === 'guarded' && (SAFE_TOOLS as readonly string[]).includes(toolName)) {
      return 'auto-allow';
    }
    const rules = this.repo.listEnabledForTool(toolName);
    return evaluateRules(rules, toolName, toolInput);
  }

  /**
   * Write a row to the audit log. Called from the terminal approval service after
   * both user decisions (via settle()) and auto-decisions (via evaluate()).
   * Uses @Optional() injection so gateway tests without the DB module still compile.
   */
  logDecision(params: {
    sessionId: string;
    toolName: string;
    summary?: string;
    resolution: ApprovalLogResolution;
    ruleId?: string;
    decidedBy: ApprovalDecidedBy;
  }): void {
    this.logRepo?.insert({
      id: randomUUID(),
      sessionId: params.sessionId,
      toolName: params.toolName,
      summary: params.summary ?? null,
      resolution: params.resolution,
      ruleId: params.ruleId ?? null,
      decidedBy: params.decidedBy,
      createdAt: new Date().toISOString(),
    });
  }

  /** Get a page of audit log entries. */
  listLog(params: { page: number; limit: number; from?: string; to?: string; taskId?: string }) {
    if (!this.logRepo) return { entries: [], total: 0, page: params.page, limit: params.limit };
    const { entries, total } = this.logRepo.list(params);
    return { entries: entries.map(toLogEntry), total, page: params.page, limit: params.limit };
  }

  list(): ApprovalRule[] {
    return this.repo.list().map(toRule);
  }

  get(id: string): ApprovalRule {
    const row = this.repo.get(id);
    if (!row) throw new NotFoundException(`approval rule ${id} does not exist`);
    return toRule(row);
  }

  create(req: CreateApprovalRule): ApprovalRule {
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id: randomUUID(),
      enabled: req.enabled,
      effect: req.effect,
      toolName: req.toolName,
      match: req.match ? JSON.stringify(req.match) : null,
      scope: req.scope,
      note: req.note ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return toRule(row);
  }

  update(id: string, req: UpdateApprovalRule): ApprovalRule {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (req.enabled !== undefined) patch.enabled = req.enabled;
    if (req.effect !== undefined) patch.effect = req.effect;
    if (req.toolName !== undefined) patch.toolName = req.toolName;
    if ('match' in req) patch.match = req.match ? JSON.stringify(req.match) : null;
    if ('note' in req) patch.note = req.note ?? null;
    if (req.scope !== undefined) patch.scope = req.scope;

    const row = this.repo.update(id, patch as Parameters<ApprovalsRepository['update']>[1]);
    if (!row) throw new NotFoundException(`approval rule ${id} does not exist`);
    return toRule(row);
  }

  remove(id: string): void {
    if (!this.repo.remove(id)) {
      throw new NotFoundException(`approval rule ${id} does not exist`);
    }
  }
}

function toRule(row: ApprovalRuleRow): ApprovalRule {
  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    effect: row.effect as ApprovalRule['effect'],
    toolName: row.toolName,
    match: row.match ? (JSON.parse(row.match) as ApprovalRuleMatch) : undefined,
    scope: 'global',
    note: row.note ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toLogEntry(row: import('../db/schema').ApprovalLogRow) {
  return {
    id: row.id,
    sessionId: row.sessionId,
    taskId: row.taskId ?? undefined,
    toolName: row.toolName,
    summary: row.summary ?? undefined,
    resolution: row.resolution as ApprovalLogResolution,
    ruleId: row.ruleId ?? undefined,
    decidedBy: row.decidedBy as ApprovalDecidedBy,
    createdAt: row.createdAt,
  };
}
