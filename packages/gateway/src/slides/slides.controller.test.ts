import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';

import { SlidesController } from './slides.controller';

function makeService() {
  return {
    listSummaries: vi.fn(() => []),
    getDeck: vi.fn(() => ({ id: 'd1' })),
    create: vi.fn((_req: unknown) => ({ id: 'd1', name: 'D' })),
    update: vi.fn(() => ({ id: 'd1' })),
    delete: vi.fn(),
  };
}

const user = { userId: 'u1', email: 'u1@x.io', teamId: 'team-1' };

let service: ReturnType<typeof makeService>;
let ctrl: SlidesController;

beforeEach(() => {
  service = makeService();
  ctrl = new SlidesController(service as never);
});

describe('SlidesController', () => {
  it('list passes the team scope through', () => {
    ctrl.list(user);
    expect(service.listSummaries).toHaveBeenCalledWith({ userId: 'u1', teamId: 'team-1' });
  });

  it('list uses undefined scope when unauthenticated (single-user)', () => {
    ctrl.list(null);
    expect(service.listSummaries).toHaveBeenCalledWith(undefined);
  });

  it('create 400s on an invalid body', () => {
    expect(() => ctrl.create({ name: '' }, user)).toThrow(BadRequestException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('create passes the parsed body + scope', () => {
    ctrl.create({ name: 'Deck' }, user);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Deck' }),
      { userId: 'u1', teamId: 'team-1' },
    );
  });

  it('update 400s on an invalid body', () => {
    expect(() => ctrl.update('d1', { name: 123 }, user)).toThrow(BadRequestException);
  });

  it('remove returns ok and forwards scope', () => {
    expect(ctrl.remove('d1', user)).toEqual({ ok: true });
    expect(service.delete).toHaveBeenCalledWith('d1', { userId: 'u1', teamId: 'team-1' });
  });
});
