import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import { ReliableBroadcastService } from './reliable-broadcast.service';
import { WsSettingsController } from './ws-settings.controller';
import type { WsBroadcastService } from './ws-broadcast.service';

const config = (ringSize: number): MidniteConfig =>
  parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {}, ws: { ringSize } });
const noopWs = { toTeam() {}, toAll() {}, toUser() {} } as unknown as WsBroadcastService;

function make(ringSize = 512) {
  const reliable = new ReliableBroadcastService(noopWs, config(ringSize));
  return { controller: new WsSettingsController(reliable), reliable };
}

describe('WsSettingsController', () => {
  it('reads the current ring size', () => {
    const { controller } = make(512);
    expect(controller.get()).toEqual({ settings: { ringSize: 512 } });
  });

  it('updates the ring size and reflects it in the service', () => {
    const { controller, reliable } = make(512);
    expect(controller.update({ ringSize: 1024 })).toEqual({ settings: { ringSize: 1024 } });
    expect(reliable.getRingSize()).toBe(1024);
  });

  it('rejects an unsupported ring size', () => {
    const { controller } = make(512);
    expect(() => controller.update({ ringSize: 999 })).toThrow(BadRequestException);
    expect(() => controller.update({})).toThrow(BadRequestException);
  });
});
