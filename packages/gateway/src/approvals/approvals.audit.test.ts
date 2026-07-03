import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { ApprovalLogRepository } from './approval-log.repository';
import type { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

// Phase 50 D — audit coverage for the safety surface: rule CRUD, policy-mode
// changes, and mirrored act-path decisions. In-memory fake repo + an audit spy.

function harness() {
  const rules = new Map<string, Record<string, unknown>>();
  let mode = 'manual';
  const repo = {
    getSettings: () => ({ id: 'singleton', mode }),
    upsertMode: vi.fn((m: string) => {
      mode = m;
    }),
    insert: (row: Record<string, unknown>) => {
      rules.set(row.id as string, row);
      return row;
    },
    get: (id: string) => rules.get(id),
    update: (id: string, patch: Record<string, unknown>) => {
      const cur = rules.get(id);
      if (!cur) return undefined;
      const next = { ...cur, ...patch };
      rules.set(id, next);
      return next;
    },
    remove: (id: string) => rules.delete(id),
    list: () => [...rules.values()],
  } as unknown as ApprovalsRepository;
  const logRepo = { insert: vi.fn() } as unknown as ApprovalLogRepository;
  const audit = { record: vi.fn() } as unknown as AuditService;
  const service = new ApprovalsService(repo, logRepo, undefined, audit);
  service.onModuleInit();
  return { service, audit, logRepo };
}

const baseRule = { enabled: true, effect: 'deny' as const, toolName: 'Bash', scope: 'global' as const };

describe('ApprovalsService — audit (Phase 50 D)', () => {
  it('audits rule creation with the rule snapshot + actor', () => {
    const { service, audit } = harness();
    const rule = service.create(baseRule, 'admin-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'approval_rule',
        entityId: rule.id,
        userId: 'admin-1',
        action: 'approval_rule.created',
      }),
    );
  });

  it('audits a rule update with a before/after diff', () => {
    const { service, audit } = harness();
    const rule = service.create(baseRule, 'admin-1');
    (audit.record as ReturnType<typeof vi.fn>).mockClear();

    service.update(rule.id, { effect: 'allow' }, 'admin-2');
    const call = (audit.record as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call).toMatchObject({ action: 'approval_rule.updated', userId: 'admin-2', entityId: rule.id });
    expect(call.payload.before.effect).toBe('deny');
    expect(call.payload.after.effect).toBe('allow');
  });

  it('audits rule deletion with the removed rule', () => {
    const { service, audit } = harness();
    const rule = service.create(baseRule, 'admin-1');
    (audit.record as ReturnType<typeof vi.fn>).mockClear();

    service.remove(rule.id, 'admin-3');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'approval_rule.deleted', userId: 'admin-3', entityId: rule.id }),
    );
  });

  it('audits a policy-mode change with a from→to diff, and skips a no-op', () => {
    const { service, audit } = harness();
    service.setMode('autonomous', 'admin-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'guardrail',
        action: 'guardrail.mode_changed',
        userId: 'admin-1',
        payload: { from: 'manual', to: 'autonomous' },
      }),
    );

    (audit.record as ReturnType<typeof vi.fn>).mockClear();
    service.setMode('autonomous', 'admin-1'); // unchanged
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('mirrors every act-path decision into the audit trail (system action)', () => {
    const { service, audit, logRepo } = harness();
    service.logDecision({
      sessionId: 'sess-1',
      toolName: 'Bash',
      resolution: 'auto-deny',
      decidedBy: 'policy',
      ruleId: 'r1',
    });
    expect(logRepo.insert).toHaveBeenCalledOnce(); // still the full per-tool record
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'guardrail',
        entityId: 'sess-1',
        userId: null,
        action: 'approval.decided',
        payload: expect.objectContaining({ toolName: 'Bash', resolution: 'auto-deny', decidedBy: 'policy' }),
      }),
    );
  });
});
