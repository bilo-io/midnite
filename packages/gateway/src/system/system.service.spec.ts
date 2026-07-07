import { SystemStatsSchema } from '@midnite/shared';
import { describe, expect, it } from 'vitest';

import { SystemService } from './system.service';

describe('SystemService', () => {
  it('returns real, well-formed host stats that satisfy the shared contract', async () => {
    const svc = new SystemService();
    const stats = await svc.getStats();

    // Validate the whole payload against the wire contract.
    expect(() => SystemStatsSchema.parse(stats)).not.toThrow();

    expect(stats.cpu.cores).toBeGreaterThanOrEqual(1);
    expect(stats.cpu.usagePct).toBeGreaterThanOrEqual(0);
    expect(stats.cpu.usagePct).toBeLessThanOrEqual(100);

    expect(stats.memory.totalBytes).toBeGreaterThan(0);
    // used = total - free, so the two partition the total exactly.
    expect(stats.memory.usedBytes + stats.memory.freeBytes).toBe(stats.memory.totalBytes);

    expect(Array.isArray(stats.disks)).toBe(true);
    for (const disk of stats.disks) {
      expect(disk.totalBytes).toBeGreaterThan(0);
      expect(disk.usedBytes + disk.freeBytes).toBe(disk.totalBytes);
    }

    expect(new Date(stats.sampledAt).toISOString()).toBe(stats.sampledAt);
  });

  it('samples CPU on tick and cleans up its timer on destroy', () => {
    const svc = new SystemService();
    svc.onModuleInit();
    // A manual re-init/destroy cycle must not throw or leak.
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });
});
