import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Workflow, WorkflowRun, WorkflowSummary } from '@midnite/shared';
import type { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';

const fakeWorkflow = { id: 'wf1', name: 'Flow', nodes: [], edges: [] } as unknown as Workflow;
const fakeSummary = { id: 'wf1', name: 'Flow', enabled: true } as unknown as WorkflowSummary;
const fakeRun = { id: 'run1', workflowId: 'wf1', status: 'succeeded' } as unknown as WorkflowRun;

function build(overrides: Partial<Record<keyof WorkflowsService, unknown>> = {}) {
  const service = {
    listSummaries: vi.fn(() => [fakeSummary]),
    create: vi.fn(() => fakeWorkflow),
    getWorkflow: vi.fn(() => fakeWorkflow),
    update: vi.fn(() => fakeWorkflow),
    delete: vi.fn(),
    run: vi.fn(() => fakeRun),
    listRuns: vi.fn(() => [fakeRun]),
    getRun: vi.fn(() => fakeRun),
    rotateWebhookSecret: vi.fn(() => ({ url: 'https://hook', secret: 's' })),
    ...overrides,
  } as unknown as WorkflowsService;
  return { controller: new WorkflowsController(service), service };
}

describe('WorkflowsController — body validation (400)', () => {
  it('rejects a create with a blank name', () => {
    const { controller } = build();
    expect(() => controller.create({ name: '  ' })).toThrow(BadRequestException);
  });

  it('rejects an update with a non-string name', () => {
    const { controller } = build();
    expect(() => controller.update('wf1', { name: 42 })).toThrow(BadRequestException);
  });

  it('rejects a run body with a non-object input', () => {
    const { controller } = build();
    expect(() => controller.run('wf1', { input: 'nope' })).toThrow(BadRequestException);
  });
});

describe('WorkflowsController — valid input delegates to the service', () => {
  it('creates with the parsed body', () => {
    const { controller, service } = build();
    expect(controller.create({ name: 'Flow' })).toEqual({ workflow: fakeWorkflow });
    expect(service.create).toHaveBeenCalledWith({ name: 'Flow' });
  });

  it('runs with the parsed input (defaulting an empty body)', () => {
    const { controller, service } = build();
    expect(controller.run('wf1', undefined)).toEqual({ run: fakeRun });
    expect(service.run).toHaveBeenCalledWith('wf1', undefined);
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.remove('wf1')).toEqual({ ok: true });
    expect(service.delete).toHaveBeenCalledWith('wf1');
  });
});

describe('WorkflowsController — service errors propagate', () => {
  it('lets a NotFoundException surface from GET :id', () => {
    const { controller } = build({
      getWorkflow: vi.fn(() => {
        throw new NotFoundException('workflow wf9 not found');
      }),
    });
    expect(() => controller.get('wf9')).toThrow(NotFoundException);
  });
});
