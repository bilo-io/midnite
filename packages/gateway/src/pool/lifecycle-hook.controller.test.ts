import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ApprovalService } from '../terminal/approval.service';
import type { TerminalService } from '../terminal/terminal.service';
import type { TasksService } from '../tasks/tasks.service';
import type { AgentRunnerService } from './agent-runner.service';
import type { SessionUsageService } from '../sessions/session-usage.service';
import { LifecycleHookController } from './lifecycle-hook.controller';

function setup(output: string) {
  const markWaiting = vi.fn();
  const emitActivity = vi.fn();
  const emitAttention = vi.fn();
  const resumeFromWaiting = vi.fn();
  const completeWithChecks = vi.fn().mockResolvedValue(undefined);
  const approvals = {
    verifySecret: (id: string, secret: string) => secret === 'good',
  } as unknown as ApprovalService;
  const tasks = {
    markWaiting,
    emitActivity,
    emitAttention,
    resumeFromWaiting,
  } as unknown as TasksService;
  const terminal = { readOutput: () => output } as unknown as TerminalService;
  const runner = { completeWithChecks } as unknown as AgentRunnerService;
  const harvestFromTranscript = vi.fn().mockResolvedValue(null);
  const usage = { harvestFromTranscript } as unknown as SessionUsageService;
  const controller = new LifecycleHookController(approvals, tasks, terminal, runner, usage);
  return {
    controller,
    markWaiting,
    emitActivity,
    emitAttention,
    resumeFromWaiting,
    completeWithChecks,
    harvestFromTranscript,
  };
}

describe('LifecycleHookController', () => {
  it('rejects an invalid secret with 404', () => {
    const { controller } = setup('');
    expect(() => controller.stop('t1', 'bad', {})).toThrow(NotFoundException);
    expect(() => controller.notification('t1', undefined, {})).toThrow(NotFoundException);
  });

  it('delegates to completeWithChecks when the agent left a PR url', () => {
    const { controller, completeWithChecks, markWaiting } = setup(
      'work done, see https://github.com/acme/web/pull/9',
    );
    expect(controller.stop('t1', 'good', { session_id: 't1' })).toEqual({ ok: true });
    expect(completeWithChecks).toHaveBeenCalledWith('t1', 'https://github.com/acme/web/pull/9');
    expect(markWaiting).not.toHaveBeenCalled();
  });

  it('marks the task waiting on a Stop with no PR url (agent paused)', () => {
    const { controller, markWaiting, completeWithChecks } = setup('asked a question, no PR yet');
    controller.stop('t1', 'good', {});
    expect(markWaiting).toHaveBeenCalledWith('t1');
    expect(completeWithChecks).not.toHaveBeenCalled();
  });

  it('marks the task waiting on a Notification', () => {
    const { controller, markWaiting } = setup('');
    expect(controller.notification('t1', 'good', { message: 'need input' })).toEqual({ ok: true });
    expect(markWaiting).toHaveBeenCalledWith('t1');
  });

  it('emits agent.activity(idle) on Stop', () => {
    const { controller, emitActivity } = setup('');
    controller.stop('t1', 'good', {});
    expect(emitActivity).toHaveBeenCalledWith('t1', 'idle');
  });

  it('harvests token usage from the Stop payload transcript_path (Phase 61 A)', () => {
    const { controller, harvestFromTranscript } = setup('');
    controller.stop('t1', 'good', { transcript_path: '/tmp/session.jsonl' });
    expect(harvestFromTranscript).toHaveBeenCalledWith('t1', '/tmp/session.jsonl');
  });

  it('does not throw when the transcript harvest rejects (fail-open)', () => {
    const { controller, harvestFromTranscript } = setup('');
    harvestFromTranscript.mockRejectedValueOnce(new Error('unreadable'));
    expect(() => controller.stop('t1', 'good', { transcript_path: '/bad' })).not.toThrow();
  });

  it('emits agent.attention(waiting) on Notification', () => {
    const { controller, emitAttention } = setup('');
    controller.notification('t1', 'good', { message: 'please review' });
    expect(emitAttention).toHaveBeenCalledWith('t1', 'waiting', 'please review');
  });

  it('emits agent.attention(waiting) with no summary when notification has no message', () => {
    const { controller, emitAttention } = setup('');
    controller.notification('t1', 'good', {});
    expect(emitAttention).toHaveBeenCalledWith('t1', 'waiting', undefined);
  });

  // Phase 69 B — the resume edge (UserPromptSubmit hook).
  it('rejects an invalid secret on user-prompt-submit with 404', () => {
    const { controller, resumeFromWaiting } = setup('');
    expect(() => controller.userPromptSubmit('t1', 'bad', {})).toThrow(NotFoundException);
    expect(resumeFromWaiting).not.toHaveBeenCalled();
  });

  it('rejects a non-object user-prompt-submit payload with 400', () => {
    const { controller, resumeFromWaiting } = setup('');
    expect(() => controller.userPromptSubmit('t1', 'good', 'nope')).toThrow(BadRequestException);
    expect(resumeFromWaiting).not.toHaveBeenCalled();
  });

  it('resumes the task and emits agent.activity(running) on UserPromptSubmit', () => {
    const { controller, resumeFromWaiting, emitActivity } = setup('');
    expect(controller.userPromptSubmit('t1', 'good', { prompt: 'keep going' })).toEqual({ ok: true });
    expect(resumeFromWaiting).toHaveBeenCalledWith('t1');
    expect(emitActivity).toHaveBeenCalledWith('t1', 'running');
  });

  it('tolerates an empty UserPromptSubmit payload (all fields optional)', () => {
    const { controller, resumeFromWaiting } = setup('');
    expect(controller.userPromptSubmit('t1', 'good', {})).toEqual({ ok: true });
    expect(resumeFromWaiting).toHaveBeenCalledWith('t1');
  });
});
