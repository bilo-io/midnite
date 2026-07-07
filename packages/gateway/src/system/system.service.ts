import { statfs } from 'node:fs/promises';
import os from 'node:os';

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { DiskStats, SystemStats } from '@midnite/shared';

import { aggregateCpuTimes, cpuUsagePct, type CpuTimes } from './lib/cpu';

// How often the background CPU sampler recomputes utilization. `os.cpus()` gives
// cumulative counters, so we hold the previous sample and diff against it — a
// single reading can't yield an instantaneous percentage.
const CPU_SAMPLE_INTERVAL_MS = 1_000;

const round = (n: number, dp = 1): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/**
 * Real host telemetry from `node:os` + `node:fs.statfs` (the gateway runs on the
 * host, so it can read them). A background interval keeps a rolling CPU-usage
 * figure; memory and disk are read on demand. All values are best-effort — disk
 * reads that fail (permissions, exotic FS) degrade to an empty list rather than
 * failing the whole response.
 */
@Injectable()
export class SystemService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemService.name);
  private prevCpu: CpuTimes = aggregateCpuTimes(os.cpus());
  private cpuUsage = 0;
  private timer: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    this.timer = setInterval(() => this.sampleCpu(), CPU_SAMPLE_INTERVAL_MS);
    // Don't keep the event loop alive on shutdown.
    this.timer.unref?.();
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

  async getStats(): Promise<SystemStats> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(totalMem - freeMem, 0);

    return {
      cpu: {
        usagePct: round(this.cpuUsage),
        cores: cpus.length,
        loadAvg1: round(os.loadavg()[0] ?? 0, 2),
        model: cpus[0]?.model?.trim() || undefined,
      },
      memory: {
        totalBytes: totalMem,
        usedBytes: usedMem,
        freeBytes: freeMem,
        usagePct: totalMem > 0 ? round((usedMem / totalMem) * 100) : 0,
      },
      disks: await this.readDisks(),
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
