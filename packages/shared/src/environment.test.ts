import { describe, expect, it } from 'vitest';
import { ENV_TOOLS_BY_OS, envToolMeta, meetsMinVersion } from './environment.js';

describe('macOS toolset', () => {
  it('defines the four required tools with full command sets', () => {
    const ids = ENV_TOOLS_BY_OS.mac.map((t) => t.id);
    expect(ids).toEqual(['homebrew', 'proto', 'node', 'moon']);
    for (const tool of ENV_TOOLS_BY_OS.mac) {
      expect(tool.label).toBeTruthy();
      expect(tool.command).toBeTruthy();
      // Detection appends `--version` itself, so the command must be a bare
      // binary name — a stray flag here breaks `command -v`.
      expect(tool.command).not.toContain(' ');
      expect(tool.installCommand).toBeTruthy();
      expect(tool.updateCommand).toBeTruthy();
      expect(tool.uninstallCommand).toBeTruthy();
    }
  });

  it('pins the version floors the request called out', () => {
    expect(envToolMeta('homebrew')?.minVersion).toBe(5);
    expect(envToolMeta('node')?.minVersion).toBe(22);
  });

  it('Windows/Linux are reference placeholders for now', () => {
    expect(ENV_TOOLS_BY_OS.windows).toEqual([]);
    expect(ENV_TOOLS_BY_OS.linux).toEqual([]);
  });
});

describe('meetsMinVersion', () => {
  it('compares the leading major version', () => {
    expect(meetsMinVersion('5.1.15', 5)).toBe(true);
    expect(meetsMinVersion('22.12.0', 22)).toBe(true);
    expect(meetsMinVersion('20.10.0', 22)).toBe(false);
    expect(meetsMinVersion('4.9.9', 5)).toBe(false);
  });

  it('treats no minimum as always satisfied', () => {
    expect(meetsMinVersion('0.56.4', undefined)).toBe(true);
    expect(meetsMinVersion(undefined, undefined)).toBe(true);
  });

  it('is unsatisfied when a required tool reports no version', () => {
    expect(meetsMinVersion(undefined, 5)).toBe(false);
  });

  it("doesn't cry wolf on unparseable versions", () => {
    expect(meetsMinVersion('stable', 5)).toBe(true);
  });
});
