import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { TerminalService } from './terminal.service';
import { TerminalController } from './terminal.controller';

function build() {
  const terminal = {
    createAdHocTerminal: vi.fn(() => 'term-1'),
  } as unknown as TerminalService;
  return { controller: new TerminalController(terminal), terminal };
}

describe('TerminalController — param validation (400)', () => {
  it('rejects an unknown CLI action', () => {
    const { controller } = build();
    expect(() => controller.createCliTerminal('frobnicate', 'claude')).toThrow(BadRequestException);
  });

  it('rejects an unknown CLI', () => {
    const { controller } = build();
    expect(() => controller.createCliTerminal('install', 'notacli')).toThrow(BadRequestException);
  });

  it('rejects an unknown env action', () => {
    const { controller } = build();
    expect(() => controller.createEnvTerminal('launch', 'node')).toThrow(BadRequestException);
  });

  it('rejects an unknown env tool', () => {
    const { controller } = build();
    expect(() => controller.createEnvTerminal('install', 'rustup')).toThrow(BadRequestException);
  });
});

describe('TerminalController — valid input builds a terminal', () => {
  it('launch runs the agent CLI immediately', () => {
    const { controller, terminal } = build();
    expect(controller.createCliTerminal('launch', 'claude')).toEqual({ terminalId: 'term-1' });
    expect(terminal.createAdHocTerminal).toHaveBeenCalledWith(expect.stringContaining('claude'));
  });

  it('install builds the install + verify chain', () => {
    const { controller, terminal } = build();
    controller.createCliTerminal('install', 'claude');
    expect(terminal.createAdHocTerminal).toHaveBeenCalledWith(expect.stringContaining('--version'));
  });

  it('builds an env tool install terminal', () => {
    const { controller, terminal } = build();
    expect(controller.createEnvTerminal('install', 'node')).toEqual({ terminalId: 'term-1' });
    expect(terminal.createAdHocTerminal).toHaveBeenCalled();
  });
});
