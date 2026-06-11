import { describe, expect, it } from 'vitest';
import type { MidniteConfig } from '@midnite/shared';
import { TerminalService, buildInstallInitCommand } from './terminal.service';

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
