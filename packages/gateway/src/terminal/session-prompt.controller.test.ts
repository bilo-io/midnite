import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from './terminal.service';
import { SessionPromptController } from './session-prompt.controller';

// A live agent session: `has` true, `hasAdHoc` false, and the task is visible.
function build({
  taskVisible = true,
  hasSession = true,
  isAdHoc = false,
}: { taskVisible?: boolean; hasSession?: boolean; isAdHoc?: boolean } = {}) {
  const sendPrompt = vi.fn();
  const terminal = {
    has: vi.fn(() => hasSession),
    hasAdHoc: vi.fn(() => isAdHoc),
    sendPrompt,
  } as unknown as TerminalService;
  const getTask = vi.fn((id: string) => {
    if (!taskVisible) throw new NotFoundException(`task ${id} not found`);
    return { id };
  });
  const tasks = { getTask } as unknown as TasksService;
  const controller = new SessionPromptController(terminal, tasks);
  return { controller, sendPrompt, getTask, terminal };
}

describe('SessionPromptController — POST /sessions/:id/prompt', () => {
  it('writes the trimmed text to the live session and returns { ok: true }', () => {
    const { controller, sendPrompt } = build();
    expect(controller.sendPrompt('task-1', { text: '  keep going  ' })).toEqual({ ok: true });
    expect(sendPrompt).toHaveBeenCalledWith('task-1', 'keep going');
  });

  it('rejects an empty/whitespace payload with 400 before touching the PTY', () => {
    const { controller, sendPrompt, getTask } = build();
    expect(() => controller.sendPrompt('task-1', { text: '   ' })).toThrow(BadRequestException);
    expect(getTask).not.toHaveBeenCalled();
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('rejects a missing text field with 400', () => {
    const { controller } = build();
    expect(() => controller.sendPrompt('task-1', {})).toThrow(BadRequestException);
  });

  it('404s (via getTask scope) when the task is unknown or out of scope', () => {
    const { controller, sendPrompt } = build({ taskVisible: false });
    expect(() => controller.sendPrompt('task-x', { text: 'hi' })).toThrow(NotFoundException);
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('409s when there is no live session for the task', () => {
    const { controller, sendPrompt } = build({ hasSession: false });
    expect(() => controller.sendPrompt('task-1', { text: 'hi' })).toThrow(ConflictException);
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('409s when the session is an ad-hoc shell, not an agent', () => {
    const { controller, sendPrompt } = build({ isAdHoc: true });
    expect(() => controller.sendPrompt('adhoc-1', { text: 'hi' })).toThrow(ConflictException);
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('threads the current user into the scoped task lookup', () => {
    const { controller, getTask } = build();
    controller.sendPrompt('task-1', { text: 'hi' }, { userId: 'u1', email: 'u@x', teamId: 't1' });
    expect(getTask).toHaveBeenCalledWith('task-1', { userId: 'u1', teamId: 't1' });
  });

  it('uses an undefined scope when unauthenticated', () => {
    const { controller, getTask } = build();
    controller.sendPrompt('task-1', { text: 'hi' }, null);
    expect(getTask).toHaveBeenCalledWith('task-1', undefined);
  });
});
