import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { TaskRetro } from '@midnite/shared';

import { RetroController } from './retro.controller';
import type { TasksService } from '../tasks/tasks.service';
import type { RetroBuilderService } from './retro-builder.service';

const retro = { taskId: 't1', outcome: 'done', narrative: null } as unknown as TaskRetro;

function make(over: { getTask?: () => unknown; getByTaskId?: () => TaskRetro | undefined } = {}) {
  const tasks = { getTask: over.getTask ?? vi.fn() } as unknown as TasksService;
  const retros = { getByTaskId: over.getByTaskId ?? vi.fn().mockReturnValue(retro) } as unknown as RetroBuilderService;
  return { controller: new RetroController(tasks, retros), tasks, retros };
}

describe('RetroController', () => {
  it('returns the stored retro, scope-checking the task first', () => {
    const getTask = vi.fn();
    const { controller } = make({ getTask });
    const res = controller.getRetro('t1', { userId: 'u1', email: 'u1@x', teamId: 'team1' });
    expect(getTask).toHaveBeenCalledWith('t1', { userId: 'u1', teamId: 'team1' });
    expect(res.retro.taskId).toBe('t1');
  });

  it('404s when no retro has been built yet', () => {
    const { controller } = make({ getByTaskId: () => undefined });
    expect(() => controller.getRetro('t1', null)).toThrow(NotFoundException);
  });

  it('propagates the task scope 404 (task not visible)', () => {
    const getTask = vi.fn(() => {
      throw new NotFoundException('task t9 not found');
    });
    const { controller, retros } = make({ getTask });
    expect(() => controller.getRetro('t9', null)).toThrow(NotFoundException);
    expect(retros.getByTaskId).not.toHaveBeenCalled();
  });
});
