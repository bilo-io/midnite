import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import {
  TerminalService,
  buildInstallInitCommand,
  gatewaySecretEnvNames,
  scrubGatewaySecrets,
} from './terminal.service';

describe('scrubGatewaySecrets (Phase 50 C)', () => {
  const config = parseConfig({ agent: {}, terminal: {}, gateway: {} });

  it('names the gateway secret env vars from config (defaults)', () => {
    expect(gatewaySecretEnvNames(config)).toEqual([
      'MIDNITE_SECRET_KEY',
      'MIDNITE_AUTH_TOKEN',
      'MIDNITE_JWT_SECRET',
      'MIDNITE_WORKFLOWS_KEY',
    ]);
  });

  it('strips only the gateway secrets, preserving the agent + host env', () => {
    const env = {
      MIDNITE_SECRET_KEY: 'k',
      MIDNITE_AUTH_TOKEN: 't',
      MIDNITE_JWT_SECRET: 'j',
      MIDNITE_WORKFLOWS_KEY: 'w',
      ANTHROPIC_API_KEY: 'agent-key', // the agent's own auth — must survive
      PATH: '/usr/bin',
    };
    const out = scrubGatewaySecrets({ ...env }, config);
    expect(out.MIDNITE_SECRET_KEY).toBeUndefined();
    expect(out.MIDNITE_AUTH_TOKEN).toBeUndefined();
    expect(out.MIDNITE_JWT_SECRET).toBeUndefined();
    expect(out.MIDNITE_WORKFLOWS_KEY).toBeUndefined();
    expect(out.ANTHROPIC_API_KEY).toBe('agent-key');
    expect(out.PATH).toBe('/usr/bin');
  });

  it('honours a non-default configured env-var name', () => {
    const custom = parseConfig({
      agent: {},
      terminal: {},
      gateway: { auth: { tokenEnv: 'MY_TOKEN' } },
    });
    expect(gatewaySecretEnvNames(custom)).toContain('MY_TOKEN');
    const out = scrubGatewaySecrets({ MY_TOKEN: 'x', KEEP: 'y' }, custom);
    expect(out.MY_TOKEN).toBeUndefined();
    expect(out.KEEP).toBe('y');
  });
});

describe('buildInstallInitCommand', () => {
  it('clears the screen then types the chain without a trailing newline', () => {
    const out = buildInstallInitCommand('npm install -g foo && foo --version && foo');
    expect(out).toBe('clear\rnpm install -g foo && foo --version && foo');
    // No trailing CR — the user presses Enter to run it.
    expect(out.endsWith('\r')).toBe(false);
  });
});

describe('ad-hoc terminals', () => {
  // Only the ad-hoc registry methods are exercised, so the other injected
  // services are never touched.
  const service = new TerminalService(
    {} as MidniteConfig,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('registers an ad-hoc terminal and recognises its id', () => {
    const id = service.createAdHocTerminal('clear\rnpm install -g foo');
    expect(id).toMatch(/^adhoc-/);
    expect(service.hasAdHoc(id)).toBe(true);
  });

  it('does not recognise unregistered ids', () => {
    expect(service.hasAdHoc('some-task-id')).toBe(false);
  });
});

describe('sendPrompt (Phase 69 C)', () => {
  const service = new TerminalService(
    {} as MidniteConfig,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  function withHandle(id: string) {
    const write = vi.fn();
    // The reply write path only touches `handle.proc.write`; stub just that.
    (service as unknown as { handles: Map<string, unknown> }).handles.set(id, { proc: { write } });
    return write;
  }

  it('writes the text plus a single Enter to the live PTY', () => {
    const write = withHandle('t1');
    service.sendPrompt('t1', 'keep going');
    expect(write).toHaveBeenCalledWith('keep going\r');
  });

  it('strips trailing newlines so exactly one Enter is sent', () => {
    const write = withHandle('t2');
    service.sendPrompt('t2', 'run tests\n\n');
    expect(write).toHaveBeenCalledWith('run tests\r');
  });

  it('is a no-op when the session has no live handle', () => {
    expect(() => service.sendPrompt('missing', 'hi')).not.toThrow();
  });
});
