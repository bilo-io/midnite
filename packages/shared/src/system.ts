import { z } from 'zod';

/**
 * Host system-stats contract.
 *
 * Real host telemetry sampled by the gateway (it runs on the host, so it can
 * read `node:os`, `node:fs.statfs` and the platform's GPU interface), served
 * from `GET /system/stats`. This is the source of truth for the dashboard's
 * CPU/RAM/GPU widgets and Disk widget and the screensaver readout — replacing
 * the earlier client-side simulation.
 *
 * All byte counts are absolute bytes; percentages are 0–100.
 */

export const CpuStatsSchema = z.object({
  /** Aggregate CPU utilization across all cores, 0–100, over the last sample. */
  usagePct: z.number().min(0).max(100),
  /** Logical core count (`os.cpus().length`). */
  cores: z.number().int().positive(),
  /**
   * 1-minute load average (`os.loadavg()[0]`). Absent on platforms that don't
   * implement it — Windows, where `os.loadavg()` returns a hard-coded `[0,0,0]`.
   * Treat absence as "unavailable"; don't render it as a zero load.
   */
  loadAvg1: z.number().nonnegative().optional(),
  /** CPU model string, when the platform reports one. */
  model: z.string().optional(),
});
export type CpuStats = z.infer<typeof CpuStatsSchema>;

export const MemoryStatsSchema = z.object({
  totalBytes: z.number().nonnegative(),
  /**
   * Memory genuinely committed — the figure Activity Monitor labels "Memory
   * Used" (app + wired + compressed) and `free` labels "used".
   */
  usedBytes: z.number().nonnegative(),
  /**
   * Memory the OS can hand out without paging — i.e. *available*, not merely
   * unallocated: it counts the reclaimable page cache that `os.freemem()`
   * excludes. `usedBytes + freeBytes === totalBytes`.
   */
  freeBytes: z.number().nonnegative(),
  usagePct: z.number().min(0).max(100),
});
export type MemoryStats = z.infer<typeof MemoryStatsSchema>;

/** Which host interface a GPU reading came from — useful when a figure looks off. */
export const GpuSourceSchema = z.enum(['ioreg', 'nvidia-smi', 'sysfs']);
export type GpuSource = z.infer<typeof GpuSourceSchema>;

/**
 * GPU utilization, where the host can report it unprivileged.
 *
 * Every field beyond `usagePct` and `source` is optional because the three
 * interfaces disagree about what exists. `nvidia-smi` gives a real VRAM
 * used/total pair; darwin's `ioreg` gives used-only (Apple Silicon's unified
 * memory has no separate VRAM total to be a percentage of); linux's amdgpu
 * sysfs node gives a bare busy-percent and nothing else.
 */
export const GpuStatsSchema = z.object({
  /** Aggregate GPU utilization, 0–100, over the host's own sampling window. */
  usagePct: z.number().min(0).max(100),
  /** Adapter name when the platform reports one (e.g. `Apple M2 Pro`). */
  name: z.string().optional(),
  /** GPU memory in use. Present on darwin + NVIDIA; absent on bare sysfs. */
  memoryUsedBytes: z.number().nonnegative().optional(),
  /**
   * Total GPU memory — **discrete adapters only**. Absent on unified-memory
   * hosts, where there is no device-local capacity to divide by; don't render a
   * memory percentage unless this is present.
   */
  memoryTotalBytes: z.number().nonnegative().optional(),
  source: GpuSourceSchema,
});
export type GpuStats = z.infer<typeof GpuStatsSchema>;

export const DiskStatsSchema = z.object({
  /** The path sampled — the mount point of the filesystem it lives on. */
  path: z.string(),
  totalBytes: z.number().nonnegative(),
  usedBytes: z.number().nonnegative(),
  /** Free space available to an unprivileged user (mirrors `df` avail). */
  freeBytes: z.number().nonnegative(),
  usagePct: z.number().min(0).max(100),
});
export type DiskStats = z.infer<typeof DiskStatsSchema>;

export const SystemStatsSchema = z.object({
  cpu: CpuStatsSchema,
  memory: MemoryStatsSchema,
  /**
   * Present only when the host exposes GPU load to an unprivileged reader.
   * **Absence means "can't tell", never "idle"** — render it as unavailable
   * rather than plotting a zero, or the chart claims a measurement it never took.
   */
  gpu: GpuStatsSchema.optional(),
  /** One entry per sampled filesystem (usually the root disk). */
  disks: z.array(DiskStatsSchema),
  platform: z.string(),
  hostname: z.string().optional(),
  uptimeSec: z.number().nonnegative(),
  /** ISO 8601 timestamp of when the gateway took this sample. */
  sampledAt: z.string(),
});
export type SystemStats = z.infer<typeof SystemStatsSchema>;
