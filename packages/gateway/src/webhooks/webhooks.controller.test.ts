import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhooksController } from './webhooks.controller';
import {
  UnsafeWebhookUrlError,
  WebhookDoesNotExistError,
  WebhookForbiddenError,
  type WebhooksService,
} from './webhooks.service';

const USER = { userId: 'u1', email: 'a@b.c', teamId: 'team-1' };
const VALID = {
  url: 'https://hooks.example.com/x',
  provider: 'slack',
  eventFilter: { events: ['task.updated'], statuses: ['done'] },
};

function makeService() {
  return { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), rotateSecret: vi.fn() };
}

let svc: ReturnType<typeof makeService>;
let controller: WebhooksController;

beforeEach(() => {
  svc = makeService();
  controller = new WebhooksController(svc as unknown as WebhooksService);
});

describe('WebhooksController', () => {
  it('list passes the team scope through', () => {
    svc.list.mockReturnValue([]);
    expect(controller.list(USER)).toEqual({ webhooks: [] });
    expect(svc.list).toHaveBeenCalledWith('team-1');
  });

  it('create 400s on an invalid body', () => {
    expect(() => controller.create(USER, { url: 'nope' })).toThrow(BadRequestException);
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('create maps UnsafeWebhookUrlError → 400', () => {
    svc.create.mockImplementation(() => {
      throw new UnsafeWebhookUrlError('http://127.0.0.1');
    });
    expect(() => controller.create(USER, VALID)).toThrow(BadRequestException);
  });

  it('create maps WebhookForbiddenError → 403', () => {
    svc.create.mockImplementation(() => {
      throw new WebhookForbiddenError();
    });
    expect(() => controller.create(USER, VALID)).toThrow(ForbiddenException);
  });

  it('update maps WebhookDoesNotExistError → 404', () => {
    svc.update.mockImplementation(() => {
      throw new WebhookDoesNotExistError('w9');
    });
    expect(() => controller.update(USER, 'w9', { enabled: false })).toThrow(NotFoundException);
  });

  it('rotate returns the reveal-once secret', () => {
    svc.rotateSecret.mockReturnValue({ webhook: { id: 'w1' }, secret: 'whsec_x' });
    expect(controller.rotate(USER, 'w1')).toEqual({ webhook: { id: 'w1' }, secret: 'whsec_x' });
  });
});
