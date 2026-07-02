import { describe, expect, it, vi } from 'vitest';
import type { TaskBoardEvent } from '@midnite/shared';
import type { AuditService } from '../audit/audit.service';
import type { TaskEventBus } from '../tasks/task-event-bus';
import type { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

// A fake settings row store: getSettings returns the last upserted guardrail state.
function harness() {
  let row: Record<string, unknown> | undefined;
  const repo = {
    getSettings: () => row,
    upsertGuardrails: vi.fn((patch: Record<string, unknown>, updatedAt: string) => {
      row = { id: 'singleton', mode: 'manual', updatedAt, ...patch };
      return row;
    }),
  } as unknown as ApprovalsRepository;
  const emitted: TaskBoardEvent[] = [];
  const bus = { emit: (e: TaskBoardEvent) => emitted.push(e) } as unknown as TaskEventBus;
  const audit = { record: vi.fn() } as unknown as AuditService;
  const service = new ApprovalsService(repo, undefined, bus, audit);
  service.onModuleInit();
  return { service, emitted, audit, repo };
}

describe('ApprovalsService — guardrails (Phase 50 A)', () => {
  it('defaults to not paused', () => {
    const { service } = harness();
    expect(service.getGuardrails().pausedGlobal).toBe(false);
    expect(service.isGloballyPaused()).toBe(false);
  });

  it('toggles a global pause and resumes it, stamping the actor', () => {
    const { service } = harness();
    const paused = service.setPause({ kind: 'global' }, true, 'admin-1');
    expect(paused.pausedGlobal).toBe(true);
    expect(paused.pausedBy).toBe('admin-1');
    expect(service.isGloballyPaused()).toBe(true);

    service.setPause({ kind: 'global' }, false, 'admin-1');
    expect(service.isGloballyPaused()).toBe(false);
  });

  it('scopes a pause to a repo — only that repo is paused', () => {
    const { service } = harness();
    service.setPause({ kind: 'repo', id: 'acme/api' }, true, 'u');
    expect(service.isTaskPaused({ repo: 'acme/api' })).toBe(true);
    expect(service.isTaskPaused({ repo: 'acme/web' })).toBe(false);
    expect(service.isGloballyPaused()).toBe(false);
  });

  it('scopes a pause to a team', () => {
    const { service } = harness();
    service.setPause({ kind: 'team', id: 'team-7' }, true, 'u');
    expect(service.isTaskPaused({ teamId: 'team-7' })).toBe(true);
    expect(service.isTaskPaused({ teamId: 'team-8' })).toBe(false);
  });

  it('a global pause overrides scope — every task is paused', () => {
    const { service } = harness();
    service.setPause({ kind: 'global' }, true, 'u');
    expect(service.isTaskPaused({ repo: 'anything' })).toBe(true);
    expect(service.isTaskPaused({})).toBe(true);
  });

  it('persists pause state so it survives a restart (reload from the row)', () => {
    const { service, repo } = harness();
    service.setPause({ kind: 'repo', id: 'acme/api' }, true, 'u');
    // Simulate a fresh service reading the same persisted row.
    const reloaded = new ApprovalsService(repo);
    reloaded.onModuleInit();
    expect(reloaded.isTaskPaused({ repo: 'acme/api' })).toBe(true);
  });

  it('setPause emits a plain guardrails.updated; audits paused/resumed', () => {
    const { service, emitted, audit } = harness();
    service.setPause({ kind: 'global' }, true, 'admin');
    const ev = emitted.at(-1);
    expect(ev?.type).toBe('guardrails.updated');
    expect(ev && 'emergencyStop' in ev ? ev.emergencyStop : undefined).toBeUndefined();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'guardrail.paused' }));
  });

  it('emergencyStop pauses AND emits emergencyStop:true with the scope', () => {
    const { service, emitted, audit } = harness();
    const res = service.emergencyStop({ kind: 'global' }, 'admin');
    expect(res.pausedGlobal).toBe(true);
    const ev = emitted.at(-1);
    expect(ev?.type).toBe('guardrails.updated');
    expect(ev && ev.type === 'guardrails.updated' ? ev.emergencyStop : false).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'guardrail.emergency_stopped' }),
    );
  });

  it('works without a bus/audit (optional deps) — no throw', () => {
    let row: Record<string, unknown> | undefined;
    const repo = {
      getSettings: () => row,
      upsertGuardrails: (patch: Record<string, unknown>, updatedAt: string) => (row = { mode: 'manual', updatedAt, ...patch }),
    } as unknown as ApprovalsRepository;
    const service = new ApprovalsService(repo);
    service.onModuleInit();
    expect(() => service.setPause({ kind: 'global' }, true, null)).not.toThrow();
    expect(service.isGloballyPaused()).toBe(true);
  });
});
