import { statfs } from 'node:fs/promises';
import os from 'node:os';

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { DiskStats, SystemStats } from '@midnite/shared';

import { aggregateCpuTimes, cpuUsagePct, type CpuTimes } from './lib/cpu';
import { type MemorySample, readMemory } from './lib/memory';

// How often the background sampler runs. `os.cpus()` gives cumulative counters,
// so we hold the previous sample and diff against it — a single reading can't
// yield an instantaneous percentage. Memory rides the same tick because probing
// it spawns `vm_stat`: one subprocess a second, regardless of how many clients
// are polling `GET /system/stats`.
const SAMPLE_INTERVAL_MS = 1_000;

const round = (n: number, dp = 1): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/**
 * Real host telemetry from `node:os`, `vm_stat`/`/proc/meminfo` and
 * `node:fs.statfs` (the gateway runs on the host, so it can read them). A
 * background interval keeps rolling CPU-usage and memory figures; disk is read
 * on demand. All values are best-effort — a memory probe that fails degrades to
 * `os.freemem()`, and disk reads that fail (permissions, exotic FS) degrade to
 * an empty list rather than failing the whole response.
 */
@Injectable()
export class SystemService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemService.name);
  private prevCpu: CpuTimes = aggregateCpuTimes(os.cpus());
  private cpuUsage = 0;
  private memory: MemorySample | null = null;
  private memoryInFlight: Promise<MemorySample> | null = null;
  private timer: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.sampleCpu();
      void this.sampleMemory();
    }, SAMPLE_INTERVAL_MS);
    // Don't keep the event loop alive on shutdown.
    this.timer.unref?.();
    // Prime the cache so the first request isn't a cold read.
    void this.sampleMemory();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private sampleCpu(): void {
    const cur = aggregateCpuTimes(os.cpus());
    this.cpuUsage = cpuUsagePct(this.prevCpu, cur);
    this.prevCpu = cur;
  }

  /**
   * Refresh the cached memory sample, collapsing concurrent callers onto a
   * single probe so a burst of requests can't spawn a burst of `vm_stat`s.
   */
  private sampleMemory(): Promise<MemorySample> {
    this.memoryInFlight ??= this.probeMemory();
    return this.memoryInFlight;
  }

  private async probeMemory(): Promise<MemorySample> {
    try {
      this.memory = await readMemory((err) =>
        this.logger.debug({ err }, 'memory probe degraded to os.freemem()'),
      );
      return this.memory;
    } finally {
      this.memoryInFlight = null;
    }
  }

  async getStats(): Promise<SystemStats> {
    const cpus = os.cpus();
    // Under Nest the sampler has primed this; a bare service (specs, scripts)
    // takes the probe on its first call.
    const [memory, disks] = await Promise.all([
      this.memory ?? this.sampleMemory(),
      this.readDisks(),
    ]);
    return {
      cpu: {
        usagePct: round(this.cpuUsage),
        cores: cpus.length,
        // `os.loadavg()` is unimplemented on Windows and returns a hard-coded
        // 0 — omit it there rather than publishing a plausible-looking zero.
        loadAvg1: process.platform === 'win32' ? undefined : round(os.loadavg()[0] ?? 0, 2),
        model: cpus[0]?.model?.trim() || undefined,
      },
      memory: {
        totalBytes: memory.totalBytes,
        usedBytes: memory.usedBytes,
        // The contract's "free" is available memory — see MemoryStatsSchema.
        freeBytes: memory.availableBytes,
        usagePct: memory.usagePct,
      },
      disks,
      platform: os.platform(),
      hostname: os.hostname() || undefined,
      uptimeSec: Math.round(os.uptime()),
      sampledAt: new Date().toISOString(),
    };
  }

  /**
   * Capacity of the filesystem hosting the gateway's working tree — the disk
   * that actually matters for the app. `bavail` is the space an unprivileged
   * user can use (mirrors `df`); "used" is everything else (incl. reserved),
   * so used + free === total and the gauge reads intuitively.
   */
  private async readDisks(): Promise<DiskStats[]> {
    const path = process.platform === 'win32' ? process.cwd().slice(0, 3) || 'C:\\' : '/';
    try {
      const fs = await statfs(path);
      const totalBytes = fs.blocks * fs.bsize;
      const freeBytes = fs.bavail * fs.bsize;
      const usedBytes = Math.max(totalBytes - freeBytes, 0);
      return [
        {
          path,
          totalBytes,
          usedBytes,
          freeBytes,
          usagePct: totalBytes > 0 ? round((usedBytes / totalBytes) * 100) : 0,
        },
      ];
    } catch (err) {
      this.logger.warn({ err }, 'reading disk stats');
      return [];
    }
  }
}
