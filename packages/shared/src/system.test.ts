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

  it('rejects a percentage above 100', () => {
    const bad = { ...valid, cpu: { ...valid.cpu, usagePct: 140 } };
    expect(() => SystemStatsSchema.parse(bad)).toThrow();
  });

  it('rejects a zero core count', () => {
    const bad = { ...valid, cpu: { ...valid.cpu, cores: 0 } };
    expect(() => SystemStatsSchema.parse(bad)).toThrow();
  });
});
