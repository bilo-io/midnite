import { describe, expect, it } from 'vitest';
import { SystemStatsSchema } from './system.js';

const GB = 1024 ** 3;
const valid = {
  cpu: { usagePct: 37.5, cores: 8, loadAvg1: 1.2, model: 'Test CPU' },
  memory: { totalBytes: 16 * GB, usedBytes: 9 * GB, freeBytes: 7 * GB, usagePct: 56.25 },
  disks: [{ path: '/', totalBytes: 500 * GB, usedBytes: 300 * GB, freeBytes: 200 * GB, usagePct: 60 }],
  platform: 'darwin',
  hostname: 'host',
  uptimeSec: 1234,
  sampledAt: '2026-06-23T12:00:00.000Z',
};

describe('SystemStatsSchema', () => {
  it('accepts a well-formed sample', () => {
    expect(SystemStatsSchema.parse(valid)).toEqual(valid);
  });

  it('allows optional model/hostname to be omitted and disks to be empty', () => {
    const { cpu, memory, ...rest } = valid;
    const trimmed = {
      ...rest,
      cpu: { usagePct: cpu.usagePct, cores: cpu.cores, loadAvg1: cpu.loadAvg1 },
      memory,
      hostname: undefined,
      disks: [],
    };
    expect(() => SystemStatsSchema.parse(trimmed)).not.toThrow();
  });

  it('allows loadAvg1 to be absent — Windows has no load average to report', () => {
    const { loadAvg1: _omitted, ...cpu } = valid.cpu;
    const parsed = SystemStatsSchema.parse({ ...valid, cpu });
    expect(parsed.cpu.loadAvg1).toBeUndefined();
  });

  it('rejects a percentage above 100', () => {
    const bad = { ...valid, cpu: { ...valid.cpu, usagePct: 140 } };
    expect(() => SystemStatsSchema.parse(bad)).toThrow();
  });

  it('rejects a zero core count', () => {
    const bad = { ...valid, cpu: { ...valid.cpu, cores: 0 } };
    expect(() => SystemStatsSchema.parse(bad)).toThrow();
  });

  describe('gpu — optional by contract', () => {
    it('parses a host with no GPU field at all', () => {
      // Absence is the normal case on hosts with no unprivileged GPU interface,
      // and it must not fail the whole stats response.
      const parsed = SystemStatsSchema.parse(valid);
      expect(parsed.gpu).toBeUndefined();
    });

    it('accepts a unified-memory reading with used bytes but no total', () => {
      const parsed = SystemStatsSchema.parse({
        ...valid,
        gpu: { usagePct: 74, name: 'Apple M2 Pro', memoryUsedBytes: 853_360_640, source: 'ioreg' },
      });
      expect(parsed.gpu?.usagePct).toBe(74);
      expect(parsed.gpu?.memoryTotalBytes).toBeUndefined();
    });

    it('accepts a discrete adapter reporting both memory figures', () => {
      const parsed = SystemStatsSchema.parse({
        ...valid,
        gpu: {
          usagePct: 37,
          name: 'NVIDIA GeForce RTX 4090',
          memoryUsedBytes: 2_147_483_648,
          memoryTotalBytes: 25_757_220_864,
          source: 'nvidia-smi',
        },
      });
      expect(parsed.gpu?.memoryTotalBytes).toBe(25_757_220_864);
    });

    it('accepts a bare sysfs busy-percent with no name or memory', () => {
      const parsed = SystemStatsSchema.parse({ ...valid, gpu: { usagePct: 42, source: 'sysfs' } });
      expect(parsed.gpu).toEqual({ usagePct: 42, source: 'sysfs' });
    });

    it('rejects an out-of-range GPU percentage', () => {
      expect(() =>
        SystemStatsSchema.parse({ ...valid, gpu: { usagePct: 140, source: 'ioreg' } }),
      ).toThrow();
    });

    it('rejects an unknown source — the provenance set is closed', () => {
      expect(() =>
        SystemStatsSchema.parse({ ...valid, gpu: { usagePct: 10, source: 'powermetrics' } }),
      ).toThrow();
    });
  });
});
