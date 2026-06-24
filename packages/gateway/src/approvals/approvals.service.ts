import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ApprovalRule,
  ApprovalRuleMatch,
  CreateApprovalRule,
  UpdateApprovalRule,
} from '@midnite/shared';
import type { ApprovalRuleRow } from '../db/schema';
import { ApprovalsRepository } from './approvals.repository';

/** Business logic for approval rules — maps DB rows ↔ shared domain types. */
@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(ApprovalsRepository) private readonly repo: ApprovalsRepository,
  ) {}

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
