import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { WorkflowsService } from './workflows.service';
import { WebhookController } from './webhook.controller';

// The per-workflow token in the path authenticates the call (the service hashes +
// constant-time compares it). The controller forwards id/token/body and wraps the run.
function build(handleWebhook: (...args: unknown[]) => unknown) {
  const service = { handleWebhook: vi.fn(handleWebhook) } as unknown as WorkflowsService;
  return { controller: new WebhookController(service), service };
}

describe('WebhookController', () => {
  it('forwards id/token/body and wraps the started run id', () => {
    const { controller, service } = build(() => ({ id: 'run-1' }));
    expect(controller.trigger('wf-1', 'tok', { hello: 'world' })).toEqual({
      ok: true,
      runId: 'run-1',
    });
    expect(service.handleWebhook).toHaveBeenCalledWith('wf-1', 'tok', { hello: 'world' });
  });

  it('defaults a null body to an empty object', () => {
    const { controller, service } = build(() => ({ id: 'run-2' }));
    controller.trigger('wf-1', 'tok', null);
    expect(service.handleWebhook).toHaveBeenCalledWith('wf-1', 'tok', {});
  });

  it('propagates the service rejection for a bad token', () => {
    const { controller } = build(() => {
      throw new NotFoundException('workflow or token not found');
    });
    expect(() => controller.trigger('wf-1', 'wrong', {})).toThrow(NotFoundException);
  });
});
