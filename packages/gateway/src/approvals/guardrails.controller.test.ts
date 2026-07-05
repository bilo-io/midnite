import { describe, expect, it } from 'vitest';
import { parseConfig, type GuardrailSettings, type MidniteConfig } from '@midnite/shared';
import type { ApprovalsService } from './approvals.service';
import { GuardrailsController } from './guardrails.controller';

const guardrails: GuardrailSettings = {
  pausedGlobal: false,
  pausedRepos: [],
  pausedTeams: [],
  pausedBy: null,
  pausedAt: null,
};

function build(config: MidniteConfig) {
  const service = {
    getGuardrails: () => guardrails,
    getMode: () => 'guarded' as const,
  } as unknown as ApprovalsService;
  return new GuardrailsController(service, config);
}

describe('GuardrailsController.get — caps block (Phase 50 F)', () => {
  it('surfaces configured hard/soft caps + rate + mode from config', () => {
    const config = parseConfig({
      agent: { maxSpawnsPerHour: 10 },
      terminal: {},
      gateway: {},
      usage: { hardDailyCapUsd: 25, monthlyBudgetUsd: 500 },
    });
    const res = build(config).get();
    expect(res.guardrails).toEqual(guardrails);
    expect(res.caps).toEqual({
      mode: 'guarded',
      hardDailyCapUsd: 25,
      hardMonthlyCapUsd: null,
      softDailyBudgetUsd: null,
      softMonthlyBudgetUsd: 500,
      maxSpawnsPerHour: 10,
      // Phase 50 E — blast-radius floor surfaced read-only (defaults on).
      blastRadiusEnabled: true,
      protectedBranches: ['main', 'master'],
      protectedPathGlobs: ['**/.env', '**/.env.*', '**/*.pem', '**/id_rsa*', '**/*.key', '**/credentials*'],
      scrubSpawnEnv: false,
    });
  });

  it('reports null caps + unlimited rate when nothing is configured', () => {
    const config = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    const { caps } = build(config).get();
    expect(caps).toMatchObject({
      hardDailyCapUsd: null,
      hardMonthlyCapUsd: null,
      softDailyBudgetUsd: null,
      softMonthlyBudgetUsd: null,
      maxSpawnsPerHour: 0,
    });
  });
});
