import { z } from 'zod';

/**
 * Host system-stats contract.
 *
 * Real host telemetry sampled by the gateway (it runs on the host, so it can
 * read `node:os` + `node:fs.statfs`), served from `GET /system/stats`. This is
 * the source of truth for the dashboard's System-monitor (CPU/RAM) and Disk
 * widgets and the screensaver readout — replacing the earlier client-side
 * simulation.
 *
 * All byte counts are absolute bytes; percentages are 0–100.
 */

export const CpuStatsSchema = z.object({
  /** Aggregate CPU utilization across all cores, 0–100, over the last sample. */
  usagePct: z.number().min(0).max(100),
  /** Logical core count (`os.cpus().length`). */
  cores: z.number().int().positive(),
  /** 1-minute load average (`os.loadavg()[0]`; 0 on platforms without it). */
  loadAvg1: z.number().nonnegative(),
  /** CPU model string, when the platform reports one. */
  model: z.string().optional(),
});
export type CpuStats = z.infer<typeof CpuStatsSchema>;

export const MemoryStatsSchema = z.object({
  totalBytes: z.number().nonnegative(),
  usedBytes: z.number().nonnegative(),
  freeBytes: z.number().nonnegative(),
  usagePct: z.number().min(0).max(100),
});
export type MemoryStats = z.infer<typeof MemoryStatsSchema>;

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
  /** One entry per sampled filesystem (usually the root disk). */
  disks: z.array(DiskStatsSchema),
  platform: z.string(),
  hostname: z.string().optional(),
  uptimeSec: z.number().nonnegative(),
  /** ISO 8601 timestamp of when the gateway took this sample. */
  sampledAt: z.string(),
});
export type SystemStats = z.infer<typeof SystemStatsSchema>;
