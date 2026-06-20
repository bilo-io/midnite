import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';

// The PreToolUse hook is authenticated by the per-session secret in the
// `x-midnite-hook-secret` header (only 'good' is valid here); never trust the body.
function build() {
  const requestDecision = vi.fn(async () => ({ decision: 'allow' as const }));
  const approvals = {
    verifySecret: (_id: string, secret: string) => secret === 'good',
    requestDecision,
  } as unknown as ApprovalService;
  const controller = new ApprovalController(approvals);
  const req = { raw: { on: vi.fn() } } as unknown as FastifyRequest;
  const validBody = { tool_name: 'Bash', tool_input: { command: 'ls' } };
  return { controller, requestDecision, req, validBody };
}

describe('ApprovalController — authenticated hook path', () => {
  it('rejects a missing secret with 404', async () => {
    const { controller, req, validBody } = build();
    await expect(controller.preToolUse('s1', undefined, validBody, req)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects a wrong secret with 404', async () => {
    const { controller, req, validBody } = build();
    await expect(controller.preToolUse('s1', 'bad', validBody, req)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not consult the service when the secret is wrong', async () => {
    const { controller, requestDecision, req, validBody } = build();
    await expect(controller.preToolUse('s1', 'bad', validBody, req)).rejects.toThrow();
    expect(requestDecision).not.toHaveBeenCalled();
  });

  it('rejects a valid secret but malformed payload with 400', async () => {
    const { controller, req } = build();
    await expect(controller.preToolUse('s1', 'good', {}, req)).rejects.toThrow(BadRequestException);
  });

  it('returns the resolved decision for a valid secret + payload', async () => {
    const { controller, requestDecision, req, validBody } = build();
    const decision = await controller.preToolUse('s1', 'good', validBody, req);
    expect(decision).toEqual({ decision: 'allow' });
    expect(requestDecision).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ tool_name: 'Bash' }),
      expect.anything(),
    );
  });
});
