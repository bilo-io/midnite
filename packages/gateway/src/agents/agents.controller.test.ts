import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AgentsConfig, PrimaryAgent, SubAgent } from '@midnite/shared';
import type { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

const fakeSubAgent = { id: 'sa1', name: 'Helper', role: '', description: '' } as unknown as SubAgent;
const fakePrimary = { name: 'Primary' } as unknown as PrimaryAgent;
const fakeConfig = { cli: 'claude', primary: fakePrimary, subAgents: [] } as unknown as AgentsConfig;

function build(overrides: Partial<Record<keyof AgentsService, unknown>> = {}) {
  const service = {
    getConfig: vi.fn(() => fakeConfig),
    updateAgentCli: vi.fn((cli: string) => cli),
    getCliStatuses: vi.fn(async () => []),
    getCliStatus: vi.fn(async () => ({ cli: 'claude', installed: true })),
    ping: vi.fn(async () => ({ ok: true })),
    updatePrimary: vi.fn(() => fakePrimary),
    createSubAgent: vi.fn(() => fakeSubAgent),
    updateSubAgent: vi.fn(() => fakeSubAgent),
    deleteSubAgent: vi.fn(),
    listHeartbeatRuns: vi.fn(() => []),
    runHeartbeatNow: vi.fn(async () => ({ id: 'hb1' })),
    ...overrides,
  } as unknown as AgentsService;
  return { controller: new AgentsController(service), service };
}

describe('AgentsController — param/body validation (400)', () => {
  it('rejects an unknown CLI on PUT /cli', () => {
    const { controller } = build();
    expect(() => controller.updateAgentCli({ cli: 'notacli' })).toThrow(BadRequestException);
  });

  it('rejects an unknown CLI on GET cli/:cli/status', async () => {
    const { controller } = build();
    await expect(controller.getCliStatus('bogus')).rejects.toThrow(BadRequestException);
  });

  it('rejects a primary patch with a blank name', () => {
    const { controller } = build();
    expect(() => controller.updatePrimary({ name: '' })).toThrow(BadRequestException);
  });

  it('rejects a sub-agent name over the limit', () => {
    const { controller } = build();
    expect(() => controller.createSubAgent({ name: 'x'.repeat(121) })).toThrow(BadRequestException);
  });
});

describe('AgentsController — valid input delegates to the service', () => {
  it('updates the CLI preference with the parsed value', () => {
    const { controller, service } = build();
    expect(controller.updateAgentCli({ cli: 'gemini' })).toEqual({ cli: 'gemini' });
    expect(service.updateAgentCli).toHaveBeenCalledWith('gemini');
  });

  it('reads the active CLI status for a valid CLI', async () => {
    const { controller, service } = build();
    await controller.getCliStatus('claude');
    expect(service.getCliStatus).toHaveBeenCalledWith('claude');
  });

  it('creates a sub-agent with the parsed body', () => {
    const { controller, service } = build();
    expect(controller.createSubAgent({ name: 'Helper' })).toEqual({ subAgent: fakeSubAgent });
    expect(service.createSubAgent).toHaveBeenCalledWith({ name: 'Helper' });
  });

  it('returns { ok: true } after deleting a sub-agent', () => {
    const { controller, service } = build();
    expect(controller.removeSubAgent('sa1')).toEqual({ ok: true });
    expect(service.deleteSubAgent).toHaveBeenCalledWith('sa1');
  });
});
