import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';

import { MilestonesController } from './milestones.controller';

function makeService() {
  return {
    listByProject: vi.fn(() => []),
    getRoadmap: vi.fn(() => ({ projectId: 'p1', milestones: [], backlog: [] })),
    create: vi.fn((_p: string, _req: unknown) => ({ id: 'm1', name: 'M' })),
    update: vi.fn(() => ({ id: 'm1' })),
    delete: vi.fn(),
    reorder: vi.fn(() => []),
    assignTask: vi.fn(() => ({ id: 't1' })),
  };
}

const user = { userId: 'u1', email: 'u1@x.io', teamId: 'team-1' };
const scope = { userId: 'u1', teamId: 'team-1' };

let service: ReturnType<typeof makeService>;
let ctrl: MilestonesController;

beforeEach(() => {
  service = makeService();
  ctrl = new MilestonesController(service as never);
});

describe('MilestonesController', () => {
  it('list forwards project id + team scope', () => {
    ctrl.list('p1', user);
    expect(service.listByProject).toHaveBeenCalledWith('p1', scope);
  });

  it('uses undefined scope when unauthenticated', () => {
    ctrl.list('p1', null);
    expect(service.listByProject).toHaveBeenCalledWith('p1', undefined);
  });

  it('roadmap wraps the view', () => {
    expect(ctrl.roadmap('p1', user)).toEqual({ roadmap: { projectId: 'p1', milestones: [], backlog: [] } });
  });

  it('create 400s on an empty name', () => {
    expect(() => ctrl.create('p1', { name: '' }, user)).toThrow(BadRequestException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('create passes the parsed body + scope', () => {
    ctrl.create('p1', { name: 'M' }, user);
    expect(service.create).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'M' }), scope);
  });

  it('reorder 400s when milestoneIds is missing', () => {
    expect(() => ctrl.reorder('p1', {}, user)).toThrow(BadRequestException);
  });

  it('reorder forwards the ordered id list', () => {
    ctrl.reorder('p1', { milestoneIds: ['b', 'a'] }, user);
    expect(service.reorder).toHaveBeenCalledWith('p1', ['b', 'a'], scope);
  });

  it('assign 400s when milestoneId is absent', () => {
    expect(() => ctrl.assign('t1', {}, user)).toThrow(BadRequestException);
  });

  it('assign accepts a null milestoneId (unassign)', () => {
    ctrl.assign('t1', { milestoneId: null }, user);
    expect(service.assignTask).toHaveBeenCalledWith('t1', null, scope);
  });

  it('remove returns ok and forwards scope', () => {
    expect(ctrl.remove('m1', user)).toEqual({ ok: true });
    expect(service.delete).toHaveBeenCalledWith('m1', scope);
  });
});
