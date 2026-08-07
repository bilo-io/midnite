import { statfs } from 'node:fs/promises';
import os from 'node:os';

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { DiskStats, GpuStats, SystemStats } from '@midnite/shared';

import { aggregateCpuTimes, cpuUsagePct, type CpuTimes } from './lib/cpu';
import { createGpuProbe, type GpuProbe } from './lib/gpu';
import { type MemorySample, readMemory } from './lib/memory';

// How often the background sampler runs. `os.cpus()` gives cumulative counters,
// so we hold the previous sample and diff against it — a single reading can't
// yield an instantaneous percentage. Memory and GPU ride the same tick because
// probing them spawns `vm_stat` / `ioreg`: a fixed couple of subprocesses a
// second, regardless of how many clients are polling `GET /system/stats`.
const SAMPLE_INTERVAL_MS = 1_000;

const round = (n: number, dp = 1): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/**
 * Real host telemetry from `node:os`, `vm_stat`/`/proc/meminfo`, the platform's
 * GPU interface and `node:fs.statfs` (the gateway runs on the host, so it can
 * read them). A background interval keeps rolling CPU, memory and GPU figures;
 * disk is read on demand. All values are best-effort — a memory probe that fails
 * degrades to `os.freemem()`, disk reads that fail (permissions, exotic FS)
 * degrade to an empty list, and a GPU we can't read is simply *omitted* rather
 * than reported as idle — all without failing the whole response.
 */
@Injectable()
export class SystemService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemService.name);
  private prevCpu: CpuTimes = aggregateCpuTimes(os.cpus());
  private cpuUsage = 0;
  private memory: MemorySample | null = null;
  private memoryInFlight: Promise<MemorySample> | null = null;
  private gpu: GpuStats | null = null;
  private gpuInFlight: Promise<GpuStats | null> | null = null;
  private readonly gpuProbe: GpuProbe = createGpuProbe((err) =>
    this.logger.debug({ err }, 'GPU telemetry unavailable on this host'),
  );
  private timer: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.sampleCpu();
      void this.sampleMemory();
      void this.sampleGpu();
    }, SAMPLE_INTERVAL_MS);
    // Don't keep the event loop alive on shutdown.
    this.timer.unref?.();
    // Prime the caches so the first request isn't a cold read.
    void this.sampleMemory();
    void this.sampleGpu();
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

  /**
   * Refresh the cached GPU sample, collapsing concurrent callers onto a single
   * probe the same way memory does. A `null` result is cached as `null` — an
   * unreadable GPU must clear a stale reading, not freeze the last good one.
   */
  private sampleGpu(): Promise<GpuStats | null> {
    this.gpuInFlight ??= this.probeGpu();
    return this.gpuInFlight;
  }

  private async probeGpu(): Promise<GpuStats | null> {
    try {
      this.gpu = await this.gpuProbe.read();
      return this.gpu;
    } finally {
      this.gpuInFlight = null;
    }
  }

  async getStats(): Promise<SystemStats> {
    const cpus = os.cpus();
    // Under Nest the sampler has primed these; a bare service (specs, scripts)
    // takes the probe on its first call. The GPU is re-probed only while the
    // probe still reports itself supported — once it has latched off, `gpu`
    // stays null and we stop paying for a subprocess that can't succeed.
    const [memory, gpu, disks] = await Promise.all([
      this.memory ?? this.sampleMemory(),
      this.gpu ?? (this.gpuProbe.supported ? this.sampleGpu() : null),
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
      // Omitted entirely when unreadable — see `SystemStatsSchema.gpu`.
      ...(gpu ? { gpu } : {}),
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
