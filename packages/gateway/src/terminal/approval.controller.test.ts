import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { TasksService } from '../tasks/tasks.service';
import type { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';

// The PreToolUse hook is authenticated by the per-session secret in the
// `x-midnite-hook-secret` header (only 'good' is valid here); never trust the body.
function build({ autoApprove = true }: { autoApprove?: boolean } = {}) {
  const requestDecision = vi.fn(async () => ({ decision: 'allow' as const }));
  const approvals = {
    verifySecret: (_id: string, secret: string) => secret === 'good',
    requestDecision,
    willAutoApprove: vi.fn(() => autoApprove),
  } as unknown as ApprovalService;
  const emitActivity = vi.fn();
  const emitAttention = vi.fn();
  const resumeFromWaiting = vi.fn();
  const tasks = { emitActivity, emitAttention, resumeFromWaiting } as unknown as TasksService;
  const controller = new ApprovalController(approvals, tasks);
  const req = { raw: { on: vi.fn() } } as unknown as FastifyRequest;
  const validBody = { tool_name: 'Bash', tool_input: { command: 'ls' } };
  return { controller, requestDecision, emitActivity, emitAttention, resumeFromWaiting, req, validBody };
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

  it('emits agent.activity(running) for an auto-approved tool call', async () => {
    const { controller, emitActivity, emitAttention, req, validBody } = build({ autoApprove: true });
    await controller.preToolUse('s1', 'good', validBody, req);
    expect(emitActivity).toHaveBeenCalledWith('s1', 'running', 'Bash', expect.any(String));
    expect(emitAttention).not.toHaveBeenCalled();
  });

  it('emits agent.activity(running) + agent.attention(approval) for a blocking approval', async () => {
    const { controller, emitActivity, emitAttention, req, validBody } = build({ autoApprove: false });
    await controller.preToolUse('s1', 'good', validBody, req);
    expect(emitActivity).toHaveBeenCalledWith('s1', 'running', 'Bash', expect.any(String));
    expect(emitAttention).toHaveBeenCalledWith('s1', 'approval', expect.any(String));
  });

  // Phase 69 B — approval-resume fallback: a permission-wait resumes mid-turn
  // with no fresh prompt, so the tool-use signal is the only resume trigger.
  it('resumes a waiting task on a tool-use signal (approval-resume fallback)', async () => {
    const { controller, resumeFromWaiting, req, validBody } = build({ autoApprove: true });
    await controller.preToolUse('s1', 'good', validBody, req);
    expect(resumeFromWaiting).toHaveBeenCalledWith('s1');
  });

  it('does not resume when the secret is wrong (guarded before any service call)', async () => {
    const { controller, resumeFromWaiting, req, validBody } = build();
    await expect(controller.preToolUse('s1', 'bad', validBody, req)).rejects.toThrow();
    expect(resumeFromWaiting).not.toHaveBeenCalled();
  });

  it('never includes raw tool_input in the emitted label', async () => {
    const sensitiveBody = {
      tool_name: 'Write',
      tool_input: { file_path: '/etc/passwd', content: 'SECRET_KEY=abc123' },
    };
    const { controller, emitActivity, req } = build({ autoApprove: true });
    await controller.preToolUse('s1', 'good', sensitiveBody, req);
    const label: string = emitActivity.mock.calls[0]?.[3] as string;
    expect(label).not.toContain('SECRET_KEY');
    expect(label).not.toContain('abc123');
  });
});
