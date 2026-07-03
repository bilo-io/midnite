import { describe, expect, it } from 'vitest';
import { parseConfig, type AutonomyMode, type MidniteConfig } from '@midnite/shared';
import type { ApprovalRuleRow } from '../db/schema';
import type { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

// Phase 50 C — the blast-radius floor inside ApprovalsService.evaluate.

function service(mode: AutonomyMode, config: MidniteConfig, rules: ApprovalRuleRow[] = []) {
  const repo = {
    getSettings: () => ({ id: 'singleton', mode }),
    listEnabledForTool: () => rules,
  } as unknown as ApprovalsRepository;
  const svc = new ApprovalsService(repo, undefined, undefined, undefined, config);
  svc.onModuleInit();
  return svc;
}

const baseConfig = parseConfig({ agent: {}, terminal: {}, gateway: {} });
const forcePush = () => ({ command: 'git push --force origin main' });

describe('ApprovalsService.evaluate — blast-radius floor (Phase 50 C)', () => {
  it('auto-denies a force-push in autonomous mode, with a reason + rule id', () => {
    const d = service('autonomous', baseConfig).evaluate('Bash', forcePush());
    expect(d.verdict).toBe('auto-deny');
    expect(d.ruleId).toBe('blast-radius:force-push');
    expect(d.reason).toMatch(/force-push/);
  });

  it('auto-denies in guarded mode too — overrides a would-be SAFE_TOOLS allow', () => {
    // `rm -rf` isn't a SAFE tool, but prove the floor runs before the rules path.
    const d = service('guarded', baseConfig).evaluate('Bash', { command: 'rm -rf /' });
    expect(d.verdict).toBe('auto-deny');
    expect(d.ruleId).toBe('blast-radius:mass-delete');
  });

  it('does NOT pre-empt in manual mode — a human still reviews (escalate)', () => {
    const d = service('manual', baseConfig).evaluate('Bash', forcePush());
    expect(d.verdict).toBe('escalate');
    expect(d.ruleId).toBeUndefined();
  });

  it('is inert when blast-radius is disabled (falls through to rules → escalate)', () => {
    const cfg = parseConfig({ agent: {}, terminal: {}, gateway: {}, guardrails: { blastRadius: { enabled: false } } });
    const d = service('autonomous', cfg).evaluate('Bash', forcePush());
    expect(d.verdict).toBe('escalate'); // no rule matches → fail-safe escalate
  });

  it('leaves an ordinary command to the normal rules path', () => {
    const d = service('autonomous', baseConfig).evaluate('Bash', { command: 'ls -la' });
    expect(d.verdict).toBe('escalate'); // no blast-radius, no rule → escalate
    expect(d.ruleId).toBeUndefined();
  });

  it('no config ⇒ no floor (fail-safe: behaves as pre-Phase-50 C)', () => {
    const repo = {
      getSettings: () => ({ id: 'singleton', mode: 'autonomous' }),
      listEnabledForTool: () => [],
    } as unknown as ApprovalsRepository;
    const svc = new ApprovalsService(repo); // no config arg
    svc.onModuleInit();
    expect(svc.evaluate('Bash', forcePush()).verdict).toBe('escalate');
  });
});
