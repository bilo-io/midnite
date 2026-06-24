import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type {
  ApprovalRule,
  ApprovalRuleMatch,
  AutonomyMode,
  CreateApprovalRule,
  UpdateApprovalRule,
} from '@midnite/shared';
import type { ApprovalRuleRow } from '../db/schema';
import { evaluateRules, type EvaluationVerdict } from './lib/rule-evaluator';
import { ApprovalsRepository } from './approvals.repository';
import { GatewaySettingsRepository } from './gateway-settings.repository';

const MODE_KEY = 'autonomy_mode';

/** Business logic for approval rules — maps DB rows ↔ shared domain types.
 *  Also owns the autonomy mode gate (Phase 23 A3): `manual` (default) short-
 *  circuits the policy engine so existing behaviour is preserved until the user
 *  opts in via Theme D. Mode is DB-persisted via GatewaySettingsRepository. */
@Injectable()
export class ApprovalsService implements OnModuleInit {
  private mode: AutonomyMode = 'manual';

  constructor(
    @Inject(ApprovalsRepository) private readonly repo: ApprovalsRepository,
    @Inject(GatewaySettingsRepository) private readonly settings: GatewaySettingsRepository,
  ) {}

  onModuleInit(): void {
    const stored = this.settings.get(MODE_KEY);
    if (stored === 'guarded' || stored === 'autonomous') {
      this.mode = stored;
    }
  }

  // ---- mode gate (Phase 23 A3 + D) ----

  getMode(): AutonomyMode {
    return this.mode;
  }

  setMode(mode: AutonomyMode): void {
    this.mode = mode;
    this.settings.set(MODE_KEY, mode);
  }

  /** Evaluate durable rules against a tool call.
   *  Returns `'escalate'` when mode is `'manual'` (no behaviour change for
   *  existing users) or when no rule matches (fail-safe). */
  evaluate(toolName: string, toolInput: unknown): EvaluationVerdict {
    if (this.mode === 'manual') return 'escalate';
    const rules = this.repo.listEnabledForTool(toolName);
    return evaluateRules(rules, toolName, toolInput);
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
