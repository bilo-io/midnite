import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ApprovalService } from '../terminal/approval.service';
import type { TerminalService } from '../terminal/terminal.service';
import type { TasksService } from '../tasks/tasks.service';
import type { AgentRunnerService } from './agent-runner.service';
import { LifecycleHookController } from './lifecycle-hook.controller';

function setup(output: string) {
  const markDone = vi.fn();
  const markWaiting = vi.fn();
  const complete = vi.fn();
  const approvals = {
    verifySecret: (id: string, secret: string) => secret === 'good',
  } as unknown as ApprovalService;
  const tasks = { markDone, markWaiting } as unknown as TasksService;
  const terminal = { readOutput: () => output } as unknown as TerminalService;
  const runner = { complete } as unknown as AgentRunnerService;
  const controller = new LifecycleHookController(approvals, tasks, terminal, runner);
  return { controller, markDone, markWaiting, complete };
}

describe('LifecycleHookController', () => {
  it('rejects an invalid secret with 404', () => {
    const { controller } = setup('');
    expect(() => controller.stop('t1', 'bad', {})).toThrow(NotFoundException);
    expect(() => controller.notification('t1', undefined, {})).toThrow(NotFoundException);
  });

  it('marks the task done + completes the run when the agent left a PR url', () => {
    const { controller, markDone, complete, markWaiting } = setup(
      'work done, see https://github.com/acme/web/pull/9',
    );
    expect(controller.stop('t1', 'good', { session_id: 't1' })).toEqual({ ok: true });
    expect(markDone).toHaveBeenCalledWith('t1', 'https://github.com/acme/web/pull/9');
    expect(complete).toHaveBeenCalledWith('t1');
    expect(markWaiting).not.toHaveBeenCalled();
  });

  it('marks the task waiting on a Stop with no PR url (agent paused)', () => {
    const { controller, markDone, markWaiting } = setup('asked a question, no PR yet');
    controller.stop('t1', 'good', {});
    expect(markWaiting).toHaveBeenCalledWith('t1');
    expect(markDone).not.toHaveBeenCalled();
  });

  it('marks the task waiting on a Notification', () => {
    const { controller, markWaiting } = setup('');
    expect(controller.notification('t1', 'good', { message: 'need input' })).toEqual({ ok: true });
    expect(markWaiting).toHaveBeenCalledWith('t1');
  });
});
